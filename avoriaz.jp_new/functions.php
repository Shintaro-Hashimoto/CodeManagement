<?php

// 1. スタイル読み込み
function my_inventory_theme_enqueue_styles() {
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
    wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array('parent-style'), wp_get_theme()->get('Version') );
}
add_action( 'wp_enqueue_scripts', 'my_inventory_theme_enqueue_styles' );

// 2. 在庫データ取得とキャッシュ
function schedule_inventory_update() {
    if ( ! wp_next_scheduled( 'daily_inventory_fetch' ) ) {
        wp_schedule_event( time(), 'hourly', 'daily_inventory_fetch' );
    }
}
add_action( 'wp', 'schedule_inventory_update' );

function fetch_and_cache_inventory() {
    $csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1030362504&single=true&output=csv';
    $response = wp_remote_get( $csv_url );
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) return;
    $rows = array_map( 'str_getcsv', explode( "\n", wp_remote_retrieve_body( $response ) ) );
    $inventory_data = [];
    $header = array_shift( $rows ); 
    $date_col_index = 0; $stay_col_index = 3; $camp_col_index = 6; $sauna_col_index = 9; 
    foreach ( $rows as $row ) {
        if ( empty( $row ) || !isset($row[$date_col_index]) ) continue;
        $inventory_data[ trim($row[$date_col_index]) ] = [
            'stay' => $row[$stay_col_index] ?? '', 'camp' => $row[$camp_col_index] ?? '', 'sauna' => $row[$sauna_col_index] ?? '', 
        ];
    }
    if ( ! empty( $inventory_data ) ) update_option( 'cached_inventory_status', json_encode( $inventory_data ), 'no' );
}
add_action( 'daily_inventory_fetch', 'fetch_and_cache_inventory' );

function fetch_and_cache_settings() {
    $settings_csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1370260269&single=true&output=csv'; 
    $response = wp_remote_get( $settings_csv_url );
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) return;
    $rows = array_map( 'str_getcsv', explode( "\n", wp_remote_retrieve_body( $response ) ) );
    $settings = [];
    array_shift( $rows );
    foreach ( $rows as $row ) {
        if ( isset($row[0]) && isset($row[1]) ) $settings[ trim($row[0]) ] = trim($row[1]);
    }
    if ( ! empty( $settings ) ) update_option( 'cached_calendar_settings', json_encode( $settings ), 'no' ); 
}
add_action( 'daily_inventory_fetch', 'fetch_and_cache_settings' );

// 3. 手動キャッシュ更新
function force_run_inventory_fetch() {
    if ( isset( $_GET['force_update_inventory'] ) && $_GET['force_update_inventory'] == 'true' ) {
        fetch_and_cache_inventory();
        fetch_and_cache_settings();
        if ( is_admin() ) add_action( 'admin_notices', function() { echo '<div class="notice notice-success"><p>在庫キャッシュ更新完了</p></div>'; });
    }
}
add_action( 'init', 'force_run_inventory_fetch' );

// 4. GAS連携
define( 'GAS_WEBHOOK_URL', 'https://script.google.com/macros/s/AKfycbwZYeWUtkR-YZ6dfzQcPRNzAmV1Vs-lYz1K1JNrCljpF-oU3BgwYZnsm4AArKTgPcB49w/exec' ); 
add_action( 'wpcf7_mail_sent', function( $contact_form ) {
    $submission = WPCF7_Submission::get_instance();
    if ( $submission ) {
        wp_remote_post( GAS_WEBHOOK_URL, array(
            'body' => json_encode( $submission->get_posted_data() ),
            'headers' => array( 'Content-Type' => 'application/json' ),
            'blocking' => true,
        ));
    }
});

// 5. メニュー登録
function my_inventory_child_setup() {
    register_nav_menus( array( 'global-menu' => 'グローバルヘッダーメニュー' ) );
}
add_action( 'after_setup_theme', 'my_inventory_child_setup', 20 );