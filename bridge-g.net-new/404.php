<?php get_header(); ?>

<main class="w-full h-[70vh] flex flex-col items-center justify-center px-6 bg-white">
    <div class="text-center fade-in">
        <h1 class="text-6xl font-bold text-gray-200 mb-4 tracking-widest">404</h1>
        <h2 class="text-xl font-medium text-gray-900 mb-6">Page Not Found</h2>
        <p class="text-sm text-gray-500 mb-8 leading-relaxed">
            お探しのページは見つかりませんでした。<br>
            URLが間違っているか、削除された可能性があります。
        </p>
        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="inline-block px-8 py-3 bg-gray-900 text-white text-xs font-bold tracking-widest rounded hover:bg-gray-700 transition-colors uppercase">
            Back to Home
        </a>
    </div>
</main>

<?php get_footer(); ?>