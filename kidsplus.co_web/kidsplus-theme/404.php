<?php
/**
 * 404 Not Found テンプレート
 */
get_header(); 
?>

<main class="page-main">
  <div class="page-box page-404">
    <div class="icon-404"></div> <h1 class="page-404-title">404</h1>
    <p class="page-404-message">
      お探しのページが見つかりませんでした。<br>
      <span class="en">Page Not Found.</span>
    </p>
    <p>
      お探しのページは、削除されたか、名前が変更された、<br classs="sp-only">
      あるいは一時的に利用できない可能性があります。<br>
      <span class="en">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</span>
    </p>

    <div class="page-404-button">
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn primary">
        ホームに戻る<span class="en">Back to Home</span>
      </a>
    </div>

  </div>
</main>

<?php get_footer(); ?>