<?php
/**
 * Template Name: 法人ポータル画面
 * Description: GASのウェブアプリを埋め込んで表示するテンプレート
 */
defined( 'ABSPATH' ) || exit;

// ★★★ ここに GASのウェブアプリURL を貼り付ける ★★★
$gas_url = "https://script.google.com/macros/s/AKfycbz2O-7QTfoL5HsIt-rSMXpM_7gByLtOKf9AzihPHB9LRe0zoc6h7LRRt-oy0r5llRYK/exec";

get_header(); 
?>

<style>
  /* ポータル専用スタイル */
  .portal-wrapper {
    width: 100%;
    min-height: 800px; /* 初期の高さ */
    position: relative;
    overflow: hidden;
  }
  .portal-iframe {
    width: 100%;
    height: 100%;
    min-height: 85vh; /* 画面の85%の高さを確保 */
    border: none;
    display: block;
  }
  
  /* スマホ調整 */
  @media (max-width: 768px) {
    .page-header { padding: 20px 0; }
    .portal-iframe { min-height: 90vh; }
  }
</style>

<main class="pages">
  <article>
    <section class="subheader">
      <div class="page-header" style="background-color: #f8f9fa;">
        <div class="container">
          <h1 class="page-title text-center" style="font-size: 1.8rem; margin: 0;">
            法人専用ポータル
          </h1>
        </div>
      </div>
    </section>

    <section class="container-fluid px-0">
      <div class="portal-wrapper">
        <iframe 
          src="<?php echo esc_url($gas_url); ?>" 
          class="portal-iframe" 
          title="Corporate Portal"
          allow="autoplay">
        </iframe>
      </div>
    </section>

  </article>
</main>

<?php get_footer(); ?>