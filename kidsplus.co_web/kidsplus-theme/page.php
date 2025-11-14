<?php
/**
 * Template for static pages
 * （プライバシーポリシー／情報セキュリティポリシー／会社概要など）
 */
?>

<?php get_header(); ?>

<main class="page-main">
  <div class="page-box">
    <?php
      if (have_posts()) :
        while (have_posts()) : the_post();
    ?>
    
    <?php // ★ アイキャッチ画像が設定されていれば表示（ここから追加）
    if ( has_post_thumbnail() ) : ?>
      <div class="page-eyecatch">
        <?php the_post_thumbnail('large'); // largeサイズで表示 ?>
      </div>
    <?php endif; // （ここまで追加） ?>

    <?php
          the_content(); // 本文（h1やpなど）
        endwhile;
      endif;
    ?>
  </div>
</main>

<?php get_footer(); ?>