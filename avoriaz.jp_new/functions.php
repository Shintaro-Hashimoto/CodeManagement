<?php

// -----------------------------------------------------------------------------
// 1. 親テーマと子テーマのスタイルシートを読み込む
// -----------------------------------------------------------------------------
function my_inventory_theme_enqueue_styles() {
    // 1. 親テーマ（Hello Elementor）のスタイルを読み込む
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
    
    // 2. 子テーマのスタイル (style.css) を読み込む
    wp_enqueue_style( 'child-style', 
                       get_stylesheet_directory_uri() . '/style.css', 
                       array('parent-style'), 
                       wp_get_theme()->get('Version') 
    );
}
add_action( 'wp_enqueue_scripts', 'my_inventory_theme_enqueue_styles' );


// -----------------------------------------------------------------------------
// 2. 在庫データ取得とキャッシュの処理
// -----------------------------------------------------------------------------

// 2-1. スケジュールを有効化 (1時間ごとに実行)
function schedule_inventory_update() {
    if ( ! wp_next_scheduled( 'daily_inventory_fetch' ) ) {
        wp_schedule_event( time(), 'hourly', 'daily_inventory_fetch' );
    }
}
add_action( 'wp', 'schedule_inventory_update' );

// 2-2. 在庫データの取得とキャッシュ保存関数
function fetch_and_cache_inventory() {
    // 【在庫データCSV公開URL】
    $csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1030362504&single=true&output=csv';
    
    $response = wp_remote_get( $csv_url );

    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
        return;
    }

    $csv_data = wp_remote_retrieve_body( $response );
    
    $rows = array_map( 'str_getcsv', explode( "\n", $csv_data ) );
    
    $inventory_data = [];
    $header = array_shift( $rows ); 

    // CSVの列インデックス (0から始まる): A列=0, D列=3, G列=6, J列=9
    $date_col_index = 0; 
    $stay_col_index = 3; 
    $camp_col_index = 6; 
    $sauna_col_index = 9; 

    foreach ( $rows as $row ) {
        if ( empty( $row ) || !isset($row[$date_col_index]) || empty($row[$date_col_index]) ) continue;
        
        $date = date('Y-m-d', strtotime($row[$date_col_index])); 
        
        $inventory_data[ $date ] = [
            'stay'    => isset($row[$stay_col_index]) ? $row[$stay_col_index] : '', 
            'camp'    => isset($row[$camp_col_index]) ? $row[$camp_col_index] : '', 
            'sauna'   => isset($row[$sauna_col_index]) ? $row[$sauna_col_index] : '', 
        ];
    }
    
    if ( ! empty( $inventory_data ) ) {
        update_option( 'cached_inventory_status', json_encode( $inventory_data ), 'no' ); 
        update_option( 'cached_inventory_status_time', time(), 'no' );
    }
}
add_action( 'daily_inventory_fetch', 'fetch_and_cache_inventory' );


// 2-3. 受付制限期間の設定を取得しキャッシュする関数
function fetch_and_cache_settings() {
    // 【制限期日設定シートCSV公開URL】
    $settings_csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSznB0V6jm84Zkmi6vb74UNaYBdaFGxNlbgJFOy3nmWZu2IdhiTLe-YKhzWKg2yu6TGW_npBNM7h0h/pub?gid=1370260269&single=true&output=csv'; 
    
    $response = wp_remote_get( $settings_csv_url );
    
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
        return;
    }

    $csv_data = wp_remote_retrieve_body( $response );
    $rows = array_map( 'str_getcsv', explode( "\n", $csv_data ) );
    
    $settings = [];
    array_shift( $rows ); // ヘッダー行をスキップ

    foreach ( $rows as $row ) {
        // CSVの構造: 0列目=ServiceKey, 1列目=LimitDate
        if ( isset($row[0]) && isset($row[1]) && !empty($row[0]) ) {
            $settings[ trim($row[0]) ] = trim($row[1]);
        }
    }
    
    if ( ! empty( $settings ) ) {
        update_option( 'cached_calendar_settings', json_encode( $settings ), 'no' ); 
    }
}
// 既存の在庫取得アクションに設定取得を追加
add_action( 'daily_inventory_fetch', 'fetch_and_cache_settings' );