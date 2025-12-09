        <div class="col-md-4">
          <a href="<?php the_permalink(); ?>" class="card">
<?php if ( has_post_thumbnail() ) : ?>
<?php the_post_thumbnail( 'blog-thumb', array( 'class' => 'thumbnailimg' ) ); ?>
<?php else : ?>
            <figure><img src="/assets/img/no_image.png" alt=""></figure>
<?php endif; ?>
            <div class="text h-100">
              <div class="d-flex justify-content-between">
                <span class="date"><?php the_time('Y.n.j'); ?></span>
                <span class="cat cat-support"><?php $cat = get_the_category(); $cat = $cat[0]; { echo $cat->cat_name; } ?></span>
              </div>
              <h3><?php the_title(); ?></h3>
            </div>
          </a>
        </div>