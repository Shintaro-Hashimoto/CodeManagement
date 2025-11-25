<?php
/**
 * Template Name: 宿泊カレンダーページ
 * Description: Google Sheetsから取得した宿泊在庫状況を表示するカレンダー
*/

$inventoryKey = 'stay'; 

get_header(); 

function get_cached_inventory() {
	$cached_data = get_option( 'cached_inventory_status' );
	if ( $cached_data ) {
		return json_decode( $cached_data, true ); 
	}
	return [];
}

function get_limit_date($key) {
	$cached_settings = get_option( 'cached_calendar_settings' );
	
	if ( $cached_settings ) {
		$settings = json_decode( $cached_settings, true );
		if (isset($settings[$key])) {
			return date('Y/m/d', strtotime($settings[$key]));
		}
	}
	return date('Y/m/d', strtotime('+6 months'));
}

$inventory = get_cached_inventory();
$js_inventory = !empty($inventory) ? json_encode($inventory) : '{}'; 
$limitEndDate = get_limit_date($inventoryKey);
?>

<div class="order-form-wrapper">
    <div class="order-form-container">
        <h1 class="form-page-title">宿泊 空室状況 & ご予約</h1>
        
        <div class="inventory-calendar-container">
            <div id="calendar-header">
                <button id="prev-month">◀ 前月</button>
                <h2 id="current-month-year" style="font-size:1.2rem; font-weight:bold;"></h2>
                <button id="next-month">翌月 ▶</button>
            </div>
            <div id="calendar-grid">
                <div class="day-header">日</div><div class="day-header">月</div><div class="day-header">火</div><div class="day-header">水</div><div class="day-header">木</div><div class="day-header">金</div><div class="day-header">土</div>
            </div>
        </div>

        <p class="calendar-note">
            ※表示金額は、大人1室2名以上ご利用の場合の1名様あたりの料金（税込）です。<br>
            ※シングルユースの場合は、料金表をご確認ください。
        </p>

        <div style="margin-top: 50px;">
            <h2 style="font-size:1.4rem; border-left:5px solid #2C5F2D; padding-left:15px; margin-bottom:20px;">予約申込みフォーム</h2>
            <p style="margin-bottom:20px; font-size:0.9rem; color:#666;">
                カレンダーの日付をクリックすると、自動で日付が入力されます。
            </p>
            <?php echo do_shortcode('[contact-form-7 id="23db074" title="宿泊予約"]'); ?>
        </div>
    </div>
</div>

<script>
	const inventoryKey = '<?php echo $inventoryKey; ?>'; 
	const INVENTORY_STATUS = <?php echo $js_inventory; ?>;
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

	function renderCalendar() {
		let dayHeaders = DAYS_CONTAINER.querySelectorAll('.day-header');
		for (let i = DAYS_CONTAINER.children.length - 1; i >= dayHeaders.length; i--) {
			DAYS_CONTAINER.removeChild(DAYS_CONTAINER.children[i]);
		}
		
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
		const startDayOfWeek = firstDayOfMonth.getDay(); 
		const daysInMonth = lastDayOfMonth.getDate();
		
		MONTH_YEAR_HEADER.textContent = `${currentYear}年 ${currentMonth + 1}月`;
		
		const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
		PREV_BUTTON.disabled = firstDayOfCurrentMonth.getTime() <= TODAY.getTime();
		
		const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
		const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
		const nextMonthString = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/01`;
		
		NEXT_BUTTON.disabled = nextMonthString > VIEW_LIMIT_END_DATE_STRING;

		for (let i = 0; i < startDayOfWeek; i++) {
			DAYS_CONTAINER.innerHTML += '<div class="calendar-day empty-day"></div>';
		}

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
            const price = statusData ? statusData['price'] : '';

			const dayElement = document.createElement('div');
			dayElement.className = 'calendar-day';
			dayElement.setAttribute('data-date', dateString);
			
            let cellContent = `<span class="day-number">${day}</span>`;
            
			if (selectedCheckIn) {
				const checkInTime = new Date(selectedCheckIn).getTime();
				if (date.getTime() === checkInTime) dayElement.classList.add('selected-from');
				
				if (selectedCheckOut) {
					const checkOutTime = new Date(selectedCheckOut).getTime();
					if (date.getTime() === checkOutTime) dayElement.classList.add('selected-to');
					if (date.getTime() > checkInTime && date.getTime() < checkOutTime) dayElement.classList.add('selected-range');
				}
			}

			if (date.getTime() < TODAY.getTime()) {
				dayElement.classList.add('empty-day', 'past-day');
				cellContent += `<span class="status-placeholder">-</span>`;
			} else if (date.getTime() > TODAY.getTime()) {
				if (currentStatus) {
					cellContent += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
                    // 金額表示 (空きがあり、金額設定がある場合)
                    if (price && price > 0 && currentStatus !== '✕' && currentStatus !== 'ー') {
                        const formattedPrice = Number(price).toLocaleString();
                        cellContent += `<span class="calendar-price">¥${formattedPrice}~</span>`;
                    }
				} else {
					cellContent += `<span class="status status-none">?</span>`;
				}
			} else {
				// 当日
				if (currentStatus === '✕' || currentStatus === 'ー') {
					cellContent += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
				} else {
					cellContent += `<span class="status status-tel">Tel </span>`; 
				}
			}
			
			if (currentStatus === '✕') {
				dayElement.classList.add('is-fully-booked');
			}
			
            dayElement.innerHTML = cellContent;
			DAYS_CONTAINER.appendChild(dayElement); 
		}
	}
	
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
	
	function isRangeAvailable(startDateStr, endDateStr) {
		let currentDate = new Date(startDateStr);
		let endDate = new Date(endDateStr);
		
		currentDate.setDate(currentDate.getDate() + 1); 
		
		while (currentDate.getTime() < endDate.getTime()) {
			const dateString = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
			const statusData = INVENTORY_STATUS[dateString];
			const currentStatus = statusData ? statusData[inventoryKey] : '';
			
			if (currentStatus === '✕' || currentStatus === 'ー') {
				return false; 
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}
		return true; 
	}

	DAYS_CONTAINER.addEventListener('click', function(event) {
		const targetDay = event.target.closest('.calendar-day');

		if (!targetDay || 
			targetDay.classList.contains('empty-day') || 
			targetDay.classList.contains('past-day') ||
			targetDay.querySelector('.status-✕') || 
			targetDay.querySelector('.status-ー') || 
			targetDay.querySelector('.status-tel') ) { 
			return; 
		}
		
		const dateSlash = targetDay.getAttribute('data-date'); 
		const clickedTime = new Date(dateSlash).getTime(); 

		if (!selectedCheckIn || selectedCheckOut) {
			selectedCheckIn = dateSlash; 
			selectedCheckOut = null;
		} else {
			const checkInTime = new Date(selectedCheckIn).getTime(); 

			if (clickedTime < checkInTime) {
				selectedCheckIn = dateSlash; 
			} else if (clickedTime > checkInTime) {
				if (isRangeAvailable(selectedCheckIn, dateSlash)) {
					selectedCheckOut = dateSlash; 
				} else {
					alert('休止期間または満室の日をまたいで選択することはできません。');
					selectedCheckIn = dateSlash; 
					selectedCheckOut = null;
				}
			}
		}

		if (checkInInput) {
			checkInInput.value = selectedCheckIn ? selectedCheckIn.replace(/\//g, '-') : '';
		}
		if (checkOutInput) {
			checkOutInput.value = selectedCheckOut ? selectedCheckOut.replace(/\//g, '-') : '';
		}

		renderCalendar();

		if (selectedCheckIn && selectedCheckOut && checkOutInput) {
			checkOutInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
</script>

<?php get_footer(); ?>