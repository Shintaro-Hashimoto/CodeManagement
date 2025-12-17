# 開発コンテキストの引き継ぎ依頼 (avoriaz_note)
現在開発中の「宿泊管理システム (AVORIAZ)」の続きをお願いします。
以下の仕様と現状を理解した上で、指示を待ってください。

## 1. システム概要
* **目的:** ペンションの宿泊・サウナ・キャンプ予約管理、顧客管理、帳票出力、メール自動化
* **構成:**
  1. **Google AppSheet:** 予約入力、顧客管理、データベース、Automation
  2. **GAS (Backend):** メール自動送信、Googleカレンダー同期、楽天メール取込、HP予約Webhook
  3. **GAS (Frontend WebApp):** 宿泊カレンダー、サウナ予約表、当日リストのWeb表示
* **データソース:** Google Spreadsheet (`1kOgnZj...`)

## 2. データベース構成 (AppSheet Tables)
| テーブル名 | シート名 | 主なカラム・役割 |
| :--- | :--- | :--- |
| **01_Customers** | 01_Customers | 顧客マスタ (ID, 氏名, 連絡先, 履歴等) |
| **02_Inventory** | 02_Inventory | 施設マスタ (宿泊/サウナ/キャンプ) |
| **03_Add_Ons** | 03_Add_Ons | オプションマスタ |
| **04_Blocked_Dates** | 04_Blocked_Dates | 休館設定 |
| **05_Reservations_Pool** | 05_Reservations_Pool | **予約データ(Main)**: ID, 顧客ID, 経路, 種別, 日程, 人数, プラン, 部屋ID, ステータス, 楽天ID, メール済フラグ, キャンセル申請, 夕食不要, 詳細, メモ |
| **06_Reservation_Details**| 06_Reservation_Details | 予約明細 |
| **07_Occupancy** | 07_Occupancy | 在庫消費データ |
| **08_HP_Inventory_Status**| 08_HP_Inventory_Status | HP用在庫データ |
| **09_Calendar_Settings** | 09_Calendar_Settings | 設定 |
| **10_Sign** | 10_Sign | 署名データ |
| **11_Pricing_Seasons** | 11_Pricing_Seasons | シーズン定義 |
| **12_Pricing_Rates** | 12_Pricing_Rates | 料金表 |
| **13_Room_Calendar_View** | 13_Room_Calendar_View | カレンダーView |
| **14_Inquiries** | 14_Inquiries | **問合せ**: 予約ID不一致のキャンセル申請もここに「未対応」として自動保存される |
| **15_Payments** | 15_Payments | **入金管理**: 予約ID紐付け、金額、決済日、決済方法、ステータス |
| **99_Operation_Log** | 99_Operation_Log | 操作ログ (楽天キャンセル受信時も記録) |

### ★AppSheet カラム設定 (Logic)
**`05_Reservations_Pool` テーブルの `[プラン]` カラム仕様:**
* **Show? / Require?:** `[申込種別] = "宿泊"` (宿泊以外は非表示・入力不要)
* **Initial Value:** `IF([申込種別] = "宿泊", "1泊2食", "")`
* **Reset on edit?:** `[申込種別] <> [_THISROW_BEFORE].[申込種別]`

## 3. AppSheet Automation 設定
* **プロセス:** `05_Reservation_Confirmed_Master` (予約確定時)
  * 条件: `AND([予約経路] <> "楽天トラベル", [メール送信しない] = FALSE)`
  * フロー: 実績作成 → メール送信判定(GAS) → フラグ更新 → カレンダー連携(GAS)
* **プロセス:** `05_Reservation_Cancelled_Master` (キャンセル時)
* **プロセス:** `05_Reservation_Status_満室` (満室NG時)
* **プロセス:** `Log_Changes`, `Update_Inventory_On_Change`

## 4. Webアプリケーション (GAS Frontend)
**ファイル:** `WebApp.gs`, `index.html`, `Config.gs`
* **宿泊カレンダー:** 縦軸部屋×横軸日付。In/Out日幅広(160px)の可変ガントチャート。
* **本日の宿泊者:** 当日リスト。A4印刷対応。人数・食事集計表示。
* **サウナ予約:** 縦軸時間×横軸日付。左軸・上部固定(Sticky)。色は宿泊と統一。

## 5. バックエンド処理 (GAS Backend)
**ファイル:** `MailSender.gs`, `CalendarSync.gs`, `EmailTrigger.gs`, `Webhook.gs`, `Utils.gs`

### 【メール自動送信 & カレンダー同期】
* 予約確定/キャンセル/満室通知。サウナ/キャンプはプラン名補完。
* 宿泊＝終日、サウナ＝時間指定でカレンダー登録。相部屋は「👥」付与。

### 【予約取込 (楽天トラベル)】
* **プラン自動判定:** メール本文の「宿泊プラン」文字列からキーワード判定。
  * `２食`→`1泊2食` / `朝食`→`1泊朝食付` / `素泊`→`食事なし` / その他
  * 同時に **`[夕食不要]` フラグ** も自動設定 (`1泊2食`以外はTRUE)。
* **詳細転記:** 元の長いプラン名文字列は `[予約詳細]` (X列) に格納。`[プラン]`列には正規化された値のみ入る。
* **ログ:** キャンセル受信時、`99_Operation_Log` に記録。

### 【予約取込 (自社HP Webhook)】
* **Webキャンセル:** * 予約ID一致 → キャンセル処理実行。
  * **予約ID不一致** → `14_Inquiries` テーブルに「ID不一致エラー」としてレコード保存 (未対応ステータス)。
* **HPフォーム:** 予約ID入力欄は8桁制限 (`minlength:8 maxlength:8`)。

## 6. 既知の制約・運用
* **楽天トラベル連携:** 書き込みAPIなし(読取専用)。在庫調整は手動。
* **HPフォーム:** 楽天ID(10桁)の誤入力を防ぐため、フォーム側で8桁制限と注意書きを実装済み。