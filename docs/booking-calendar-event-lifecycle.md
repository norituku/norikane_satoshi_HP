# Booking calendar event lifecycle

## Goal

`BookingGroup` を単位として、Google Calendar に属する全イベントを漏れなく作成・更新・取消・照合する。
複数日の一部だけが成功しても、成功済みイベントを複製せず、未完了分だけを再試行する。

## Source of truth

- `BookingGroup`: 顧客の予約・日程相談そのもの。
- `BookingCalendarEvent`: その予約グループが Google Calendar に持つべきイベントの durable intent。
- Google Calendar / Notion: 外部投影。Google は DB intent から再生成し、Notion は cc-notion の明示 ACK と照合する。
- `BookingGroup.gcalEventId`: 移行期間中の primary event 互換フィールド。新規処理の正本にはしない。

## Invariants

1. 外部 API を呼ぶ前に、必要な全イベントを `PENDING_CREATE` で保存する。
2. `eventId` は予約グループと区間から決定的に作り、Google Calendar の 409 は成功として再解決する。
3. 作成済みイベントだけが `CONFIRMED` になる。途中失敗は他行を巻き戻さず、未完了行を残す。
4. 取消は先に全行を `PENDING_DELETE` にし、Google イベントを transparent 化して `hp_booking_cancel_requested=1` を付ける。cc-notion が対応する Notion ページをアーカイブして ACK を付けた後だけ Google イベントを削除し、DB 行を `CANCELLED` にする。
5. 再調整はグループを `PENDING_GCAL_REPLACE`、旧 intent を `SUPERSEDED` にして、新しい intent の確認後だけ旧イベントの取消へ進む。プロセス停止後も cron が同じフェーズから再開し、置換途中で希望日がゼロにならない。
6. cron は pending 行を再実行し、古い `CONFIRMED` 行も全件巡回する。欠損は同じ deterministic ID で再作成し、日時・終日区分・表示・タスク種別の drift は intent へ戻す。別グループの所有マーカーがあるイベントは上書きしない。
7. グループを物理削除するのは、配下イベントがすべて Notion ACK 済みかつ Google Calendar から消えた後だけにする。
8. Notion の終日ミラーと3つのお客様導線では、`仮押さえ` は選択可能、`本予約` は予約不可という既存契約を維持する。

## Rollout

1. additive migration を先に適用する。
2. 既存 `gcalEventId` と Google Calendar の `source=hp-booking` イベントを突合し、全イベントを backfill する。
3. 新コードを dual-write で展開し、読み取り・取消・reconcile は relation 優先、legacy field fallback とする。
4. Production で backfill 件数と orphan 件数がゼロであることを確認する。
5. legacy field の削除は別タスク・別 migration とし、この rollout では行わない。
