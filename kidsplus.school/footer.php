<?php
/**
 * The template for displaying the footer.
 *
 * Contains the closing of the #content div and all content after
 *
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

?>
<?php get_template_part( 'global-templates/bread' ); ?>
<footer id="footer">
  <div class="container-fluid">
    <div class="row justify-content-between">
      <div class="col-md-6">
        <a href="https://www.kidsplus.me/" target="_blank" rel="noopener noreferrer">KIDS PLUS english - 楽しく学ぶ。未来を創る。</a>
      </div>
      <div class="col-md-6 text-md-end">
        <div class="copyright">Copyright&copy; 2024 kids plus All rights reserved.</div>
      </div>

    </div>
  </div>
</footer>

<?php get_template_part( 'global-templates/nav' ); ?>
<div id="backto" class="anime anime--up"><span class="top"><i class="ri-skip-up-line"></i></span></div>
<?php wp_footer(); ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Noto+Serif+JP:wght@400;500;600;900&family=Barlow+Condensed:wght@400;500&display=swap" rel="stylesheet">
</body>
</html>