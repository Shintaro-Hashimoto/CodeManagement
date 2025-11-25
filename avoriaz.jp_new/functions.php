<?php

// -----------------------------------------------------------------------------
// 1. スタイル・スクリプトの読み込み
// -----------------------------------------------------------------------------
function my_inventory_theme_enqueue_assets() {
    // 親テーマ（Hello Elementor）のスタイル
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
    // 子テーマのスタイル
    wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array('parent-style'), wp_get_theme()->get('Version') );
    
    // 特定ページ用JSの読み込み

    // キャンプページ用JS
    if ( is_page('camp') ) {
        wp_enqueue_script( 'camp-script', get_stylesheet_directory_uri() . '/js/camp.js', array(), '1.0.0', true );
    }
    // シュトーレン注文ページ用JS
    if ( is_page('stollen-order') ) {
        wp_enqueue_script( 'stollen-script', get_stylesheet_directory_uri() . '/js/stollen-order.js', array(), '1.0.0', true );
    }

    // ★ 追加: 宿泊予約ページ用JS (キャンセルポリシー警告)
    // ※スラッグが 'stay-calendar' または 'stay' のページで読み込みます
    // 必要に応じてスラッグ名を変更してください
    if ( is_page('stay-calendar') || is_page('stay') ) { 
        wp_enqueue_script( 'booking-alert-script', get_stylesheet_directory_uri() . '/js/booking-alert.js', array(), '1.0.0', true );
    }
}
add_action( 'wp_enqueue_scripts', 'my_inventory_theme_enqueue_assets' );


// -----------------------------------------------------------------------------
// 2. 在庫データ取得とキャッシュの処理
// -----------------------------------------------------------------------------

// 2-1. スケジュール有効化 (1時間ごと)
function schedule_inventory_update() {
    if ( ! wp_next_scheduled( 'daily_inventory_fetch' ) ) {
        wp_schedule_event( time(), 'hourly', 'daily_inventory_fetch' );
    }
}
add_action( 'wp', 'schedule_inventory_update' );

// 2-2. 在庫データの取得とキャッシュ保存
function fetch_and_cache_inventory() {
    // 在庫データCSV (08_HP_Inventory_Status)
    $csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1030362504&single=true&output=csv';
    
    // キャッシュバスター(&t=time())を追加して最新データを強制取得
    $response = wp_remote_get( $csv_url . '&t=' . time() );

    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) return;
    
    $csv_data = wp_remote_retrieve_body( $response );
    $rows = array_map( 'str_getcsv', explode( "\n", $csv_data ) );
    
    $inventory_data = [];
    $header = array_shift( $rows ); // ヘッダー除去

    // 列インデックス定義 (A=0)
    // D列=3(宿泊), G列=6(キャンプ), J列=9(サウナ)
    // K列=10(最安値)
    $date_col_index = 0; 
    $stay_col_index = 3; 
    $camp_col_index = 6; 
    $sauna_col_index = 9;
    $price_col_index = 10; 

    foreach ( $rows as $row ) {
        if ( empty( $row ) || !isset($row[$date_col_index]) ) continue;
        
        // 日付フォーマット統一 (ハイフンをスラッシュに変換)
        $raw_date = trim($row[$date_col_index]);
        $date_key = str_replace('-', '/', $raw_date);

        $inventory_data[ $date_key ] = [
            'stay'  => $row[$stay_col_index] ?? '', 
            'camp'  => $row[$camp_col_index] ?? '', 
            'sauna' => $row[$sauna_col_index] ?? '',
            'price' => $row[$price_col_index] ?? '', // 金額データ
        ];
    }
    
    if ( ! empty( $inventory_data ) ) {
        update_option( 'cached_inventory_status', json_encode( $inventory_data ), 'no' );
        update_option( 'cached_inventory_status_time', time(), 'no' );
    }
}
add_action( 'daily_inventory_fetch', 'fetch_and_cache_inventory' );

// 2-3. 設定データの取得とキャッシュ保存
function fetch_and_cache_settings() {
    // 設定データCSV (09_Calendar_Settings)
    $settings_csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1370260269&single=true&output=csv'; 
    
    $response = wp_remote_get( $settings_csv_url );
    
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) return;

    $csv_data = wp_remote_retrieve_body( $response );
    $rows = array_map( 'str_getcsv', explode( "\n", $csv_data ) );
    
    $settings = [];
    array_shift( $rows ); // ヘッダー除去

    foreach ( $rows as $row ) {
        // 0列目=ServiceKey, 1列目=LimitDate
        if ( isset($row[0]) && isset($row[1]) ) {
            $settings[ trim($row[0]) ] = trim($row[1]);
        }
    }
    
    if ( ! empty( $settings ) ) {
        update_option( 'cached_calendar_settings', json_encode( $settings ), 'no' ); 
    }
}
add_action( 'daily_inventory_fetch', 'fetch_and_cache_settings' );


// -----------------------------------------------------------------------------
// 3. 手動キャッシュ更新機能 (管理画面用URLトリガー)
// -----------------------------------------------------------------------------
function force_run_inventory_fetch() {
    // URLに ?force_update_inventory=true があれば実行
    if ( isset( $_GET['force_update_inventory'] ) && $_GET['force_update_inventory'] == 'true' ) {
        
        fetch_and_cache_inventory();
        fetch_and_cache_settings();
        
        if ( is_admin() ) {
            add_action( 'admin_notices', function() {
                echo '<div class="notice notice-success is-dismissible"><p>AppSheet連携：在庫と設定のキャッシュを強制的に更新しました。</p></div>';
            });
        }
    }
}
add_action( 'init', 'force_run_inventory_fetch' );


// -----------------------------------------------------------------------------
// 4. Contact Form 7 送信データをGASへWebhook送信
// -----------------------------------------------------------------------------
// 発行されたGASウェブアプリURL
define( 'GAS_WEBHOOK_URL', 'https://script.google.com/macros/s/AKfycbwZYeWUtkR-YZ6dfzQcPRNzAmV1Vs-lYz1K1JNrCljpF-oU3BgwYZnsm4AArKTgPcB49w/exec' ); 

add_action( 'wpcf7_mail_sent', 'send_cf7_data_to_gas' );

function send_cf7_data_to_gas( $contact_form ) {
    $submission = WPCF7_Submission::get_instance();
    
    if ( $submission ) {
        $posted_data = $submission->get_posted_data();
        
        // GASへPOST送信
        $args = array(
            'body'    => json_encode( $posted_data ),
            'headers' => array( 'Content-Type' => 'application/json' ),
            'timeout' => 10,
            'blocking' => true,
        );
        
        $response = wp_remote_post( GAS_WEBHOOK_URL, $args );

        if ( is_wp_error( $response ) ) {
            error_log( 'GAS Webhook Error: ' . $response->get_error_message() );
        }
    }
}


// -----------------------------------------------------------------------------
// 5. メニュー機能の有効化
// -----------------------------------------------------------------------------
function my_inventory_child_setup() {
    register_nav_menus( array(
        'global-menu' => 'グローバルヘッダーメニュー',
    ) );
}
add_action( 'after_setup_theme', 'my_inventory_child_setup', 20 );