<?php
/**
 * Template Name: キャンプ場カレンダーページ
 * Description: Google Sheetsから取得したキャンプ場在庫状況を表示するカレンダー
*/

$inventoryKey = 'camp'; 

get_header(); 

// ==========================================================
// 1. キャッシュデータの読み込み関数
// ==========================================================
function get_cached_inventory() {
	$cached_data = get_option( 'cached_inventory_status' );
	if ( $cached_data ) {
		return json_decode( $cached_data, true ); 
	}
	return [];
}

// 制限日を取得する関数 (09_Calendar_Settingsと連携)
function get_limit_date($key) {
	$cached_settings = get_option( 'cached_calendar_settings' );
	if ( $cached_settings ) {
		$settings = json_decode( $cached_settings, true );
		// スラッシュ形式のフォールバック (キャンプ用に変更)
		return isset($settings[$key]) ? $settings[$key] : '2026/06/30'; 
	}
	return '2026/06/30'; 
}

$inventory = get_cached_inventory();
$js_inventory = !empty($inventory) ? json_encode($inventory) : '{}'; 
$last_update_time = get_option( 'cached_inventory_status_time', time() );

// 制限日をAppSheet（のキャッシュ）から取得
$limitEndDate = get_limit_date($inventoryKey);
?>

<div id="primary" class="content-area">
	<main id="main" class="site-main">
		<h1>空庭 空き状況</h1>
		<div class="inventory-calendar-container">
			<div id="calendar-header">
				<button id="prev-month">◀ 前月</button>
				<h2 id="current-month-year"></h2>
				<button id="next-month">翌月 ▶</button>
			</div>
			
			<div id="calendar-grid">
				<div class="day-header">日</div>
				<div class="day-header">月</div>
				<div class="day-header">火</div>
				<div class="day-header">水</div>
				<div class="day-header">木</div>
				<div class="day-header">金</div>
				<div class="day-header">土</div>
			</div>
		</div>

		<?php
		// 空庭予約フォームID: da0fc22
		echo '<h2 style="margin-top: 40px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">空庭（キャンプ）予約フォーム</h2>';
		echo do_shortcode('[contact-form-7 id="da0fc22" title="空庭予約"]'); 
		?>
		
	</main>
</div>

<script>
	// ==========================================================
	// 2. 在庫データとJavaScript変数
	// ==========================================================
	const inventoryKey = '<?php echo $inventoryKey; ?>'; 
	const INVENTORY_STATUS = <?php echo $js_inventory; ?>;
	
	// PHPから取得した制限日を文字列として保持
	const VIEW_LIMIT_END_DATE_STRING = '<?php echo $limitEndDate; ?>';

	const TODAY = new Date();
	TODAY.setHours(0, 0, 0, 0); 
	
	let currentMonth = TODAY.getMonth();
	let currentYear = TODAY.getFullYear();
	
	const DAYS_CONTAINER = document.getElementById('calendar-grid'); 
	const MONTH_YEAR_HEADER = document.getElementById('current-month-year');
	const PREV_BUTTON = document.getElementById('prev-month');
	const NEXT_BUTTON = document.getElementById('next-month');

	let selectedCheckIn = null;
	let selectedCheckOut = null;
	const checkInInput = document.querySelector('input[name="checkin-date"]');
	const checkOutInput = document.querySelector('input[name="checkout-date"]');

	
	// ==========================================================
	// 3. カレンダー描画関数 (「Tel 」優先度 修正)
	// ==========================================================
	function renderCalendar() {
		// 曜日のヘッダー（7個）を残して日付セルを全てクリア
		let dayHeaders = DAYS_CONTAINER.querySelectorAll('.day-header');
		for (let i = DAYS_CONTAINER.children.length - 1; i >= dayHeaders.length; i--) {
			DAYS_CONTAINER.removeChild(DAYS_CONTAINER.children[i]);
		}
		
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
		const startDayOfWeek = firstDayOfMonth.getDay(); 
		const daysInMonth = lastDayOfMonth.getDate();
		
		MONTH_YEAR_HEADER.textContent = `${currentYear}年 ${currentMonth + 1}月`;
		
		// ------------------------------------------------------
		// ナビゲーションボタンの制限
		// ------------------------------------------------------
		const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
		if (firstDayOfCurrentMonth.getTime() <= TODAY.getTime()) {
			PREV_BUTTON.disabled = true;
		} else {
			PREV_BUTTON.disabled = false;
		}
		
		const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
		const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
		const nextMonthString = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/01`;
		
		if (nextMonthString > VIEW_LIMIT_END_DATE_STRING) {
			NEXT_BUTTON.disabled = true;
		} else {
			NEXT_BUTTON.disabled = false;
		}
		// ------------------------------------------------------
		
		// 1. 月の開始位置までの空白セルを追加
		for (let i = 0; i < startDayOfWeek; i++) {
			DAYS_CONTAINER.innerHTML += '<div class="calendar-day empty-day"></div>';
		}

		// 2. 日付セルと在庫状況を追加
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(currentYear, currentMonth, day);
			date.setHours(0, 0, 0, 0); 
			
			const dateString = `${currentYear}/${String(currentMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
			
			if (dateString > VIEW_LIMIT_END_DATE_STRING) {
				DAYS_CONTAINER.innerHTML += '<div class="calendar-day empty-day"></div>'; 
				continue; 
			}

			const statusData = INVENTORY_STATUS[dateString];
			const currentStatus = statusData ? statusData[inventoryKey] : ''; 

			const dayElement = document.createElement('div');
			dayElement.className = 'calendar-day';
			dayElement.setAttribute('data-date', dateString);
			dayElement.innerHTML = `<span class="day-number">${day}</span>`;
			
			// 選択状態に基づいてクラスを付与
			if (selectedCheckIn) {
				const checkInTime = new Date(selectedCheckIn).getTime();
				
				if (date.getTime() === checkInTime) {
					dayElement.classList.add('selected-from');
				}
				
				if (selectedCheckOut) {
					const checkOutTime = new Date(selectedCheckOut).getTime();
					if (date.getTime() === checkOutTime) {
						dayElement.classList.add('selected-to');
					}
					if (date.getTime() > checkInTime && date.getTime() < checkOutTime) {
						dayElement.classList.add('selected-range');
					}
				}
			}

			// ★ 修正: 過去日、明日以降、当日の順でステータス表示を分岐
			if (date.getTime() < TODAY.getTime()) {
				// 1. 過去の日付
				dayElement.classList.add('empty-day', 'past-day');
				dayElement.innerHTML += `<span class="status-placeholder">-</span>`;
			} else if (date.getTime() > TODAY.getTime()) {
				// 2. 明日以降
				if (currentStatus) {
					dayElement.innerHTML += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
				} else {
					dayElement.innerHTML += `<span class="status status-none">?</span>`;
				}
			} else {
				// 3. ★ 当日 (date.getTime() === TODAY.getTime())
				if (currentStatus === '✕' || currentStatus === 'ー') {
					// 3a. 当日だが満室(✕)または休止(ー)の場合 (そちらを優先)
					dayElement.innerHTML += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
				} else {
					// 3b. 当日で空きがある(○, △, ?)場合
					dayElement.innerHTML += `<span class="status status-tel">Tel </span>`; 
				}
			}
			
			if (currentStatus === '✕') {
				dayElement.classList.add('is-fully-booked');
			}
			
			DAYS_CONTAINER.appendChild(dayElement); 
		}
	}
	
	// ==========================================================
	// 4. イベントリスナーと初期化
	// ==========================================================
	document.getElementById('prev-month').addEventListener('click', () => {
		currentMonth--;
		if (currentMonth < 0) {
			currentMonth = 11;
			currentYear--;
		}
		renderCalendar();
	});

	document.getElementById('next-month').addEventListener('click', () => {
		currentMonth++;
		if (currentMonth > 11) {
			currentMonth = 0;
			currentYear++;
		}
		renderCalendar();
	});

	renderCalendar();
	
	// ==========================================================
	// ★ 5. カレンダーの日付クリック (期間チェックロジック追加)
	// ==========================================================
	
	// --- 補助関数: 2つの日付間の在庫をチェック ---
	function isRangeAvailable(startDateStr, endDateStr) {
		let currentDate = new Date(startDateStr);
		let endDate = new Date(endDateStr);
		
		// チェックインの翌日からチェックアウトの前日までループ
		currentDate.setDate(currentDate.getDate() + 1); 
		
		while (currentDate.getTime() < endDate.getTime()) {
			const dateString = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
			
			const statusData = INVENTORY_STATUS[dateString];
			const currentStatus = statusData ? statusData[inventoryKey] : '';
			
			if (currentStatus === '✕' || currentStatus === 'ー') {
				return false; // 期間内にNGな日を発見
			}
			
			currentDate.setDate(currentDate.getDate() + 1);
		}
		
		return true; // 期間内はすべて利用可能
	}

	// --- メインのクリックイベントリスナー ---
	DAYS_CONTAINER.addEventListener('click', function(event) {
		const targetDay = event.target.closest('.calendar-day');

		// 空白セルや過去日、満室(✕)、休止(ー)、当日(Tel)の日は無視
		if (!targetDay || 
			targetDay.classList.contains('empty-day') || 
			targetDay.classList.contains('past-day') ||
			targetDay.querySelector('.status-✕') || // 満室チェック
			targetDay.querySelector('.status-ー') || // 休止チェック
			targetDay.querySelector('.status-tel') ) { // 当日("Tel")チェック
			return; // クリック無効
		}
		
		const dateSlash = targetDay.getAttribute('data-date'); // "yyyy/mm/dd"
		const clickedTime = new Date(dateSlash).getTime(); 

		// 1. チェックイン未選択 or チェックアウト済(新規選択) の場合
		if (!selectedCheckIn || selectedCheckOut) {
			selectedCheckIn = dateSlash; // スラッシュ形式で保存
			selectedCheckOut = null;
		} 
		// 2. チェックイン選択済 の場合
		else {
			const checkInTime = new Date(selectedCheckIn).getTime(); 

			// 2a. チェックインより前をクリック (チェックインの変更)
			if (clickedTime < checkInTime) {
				selectedCheckIn = dateSlash; // スラッシュ形式で保存
			}
			// 2b. チェックインより後をクリック (チェックアウトの決定)
			else if (clickedTime > checkInTime) {
				
				// ★ 追加: 期間チェック
				if (isRangeAvailable(selectedCheckIn, dateSlash)) {
					// 利用可能
					selectedCheckOut = dateSlash; // スラッシュ形式で保存
				} else {
					// 利用不可 (期間内に ✕ か ー がある)
					alert('休止期間（ー）または満室（✕）の日をまたいで選択することはできません。');
					selectedCheckIn = dateSlash; // 選択をリセットし、クリックした日を新しいチェックイン日にする
					selectedCheckOut = null;
				}
				
			}
			// (チェックインと同日クリックは無視)
		}

		// フォームに値をセット (★ここでハイフンに変換)
		if (checkInInput) {
			checkInInput.value = selectedCheckIn ? selectedCheckIn.replace(/\//g, '-') : '';
		}
		if (checkOutInput) {
			checkOutInput.value = selectedCheckOut ? selectedCheckOut.replace(/\//g, '-') : '';
		}

		// ★ カレンダーのハイライトを更新するために renderCalendar を再呼び出し
		renderCalendar();

		// (オプション) チェックアウトが選ばれたらフォームへスクロール
		if (selectedCheckIn && selectedCheckOut && checkOutInput) {
			checkOutInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
</script>

<?php get_footer(); ?>