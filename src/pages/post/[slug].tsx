import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import ReactLoading from 'react-loading';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  uid: string;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  pagination: {
    nextPage: {
      title: string;
      href: string;
    };
    prevPage: {
      title: string;
      href: string;
    };
  };
}

export default function Post({ post, preview, pagination }: PostProps) {
  const { isFallback } = useRouter();

  const commentsSection = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasScript = commentsSection?.current?.querySelector('.utterances');

    if (hasScript) {
      hasScript.remove();
    }

    const utteranceScript = document.createElement('script');

    utteranceScript.src = 'https://utteranc.es/client.js';
    utteranceScript.crossOrigin = 'anonymous';
    utteranceScript.async = true;
    utteranceScript.setAttribute('repo',
      'eldoncosta1/chapter-iii-desafio-02-ignite-add-new-feature-'
    );
    utteranceScript.setAttribute('issue-term', 'title');
    utteranceScript.setAttribute('theme', 'github-dark');

    commentsSection.current?.appendChild(utteranceScript);
  }, [post]);

  function getTimeToWorld() {
    const count_worlds = post?.data.content.reduce(
      (acc, item_post) => {
        let heading = [];
        let body = [];
        if (item_post.heading) {
          heading = item_post.heading.split(' ');
        }
        if (item_post.body) {
          const removeSpecialCharacters = RichText.asText(item_post?.body)
            .toString()
            .replace(/[^a-zA-Z0-9 ]/g, '');
          body = removeSpecialCharacters.split(' ');
        }
        acc.heading += heading.length;
        acc.body += body.length;

        return acc;
      },
      {
        heading: 0,
        body: 0,
      }
    );
    return `${Math.ceil((count_worlds?.heading + count_worlds?.body) / 200)} min`;
  }

  return (isFallback ? (
    <div className={commonStyles.loading}>
      <ReactLoading type="bars" color="#FF57B2" />
    </div>
  ) : (
    <>
      <div className={styles.header}>
        <Header />
      </div>
      <section className={`${styles.banner}`}>
        <img src={post?.data.banner.url} alt={post?.data.title} />
      </section>
      <main className={`${commonStyles.container} ${styles.content}`}>
        <div className={commonStyles.posts}>
          <a className={styles.title}>{post?.data.title}</a>
          <p className={commonStyles.subtitle} />
          <div>
            <time>
              <FiCalendar size={20} />
              {post?.first_publication_date
                ? format(
                  new Date(post?.first_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: ptBR
                  }
                )
                : 'Data publicação'}
            </time>
            <span>
              <FiUser size={20} /> {post?.data.author}
            </span>
            <span>
              <FiClock size={20} /> {getTimeToWorld()}
            </span>
          </div>
        </div>
        {post?.data.content.map(paragraph => (
          <div key={`${paragraph.heading}-${paragraph.body}`}>
            <div
              className={styles.containerHeading}
              dangerouslySetInnerHTML={{
                __html: paragraph.heading,
              }}
            />
            <div
              className={styles.containerBody}
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(paragraph.body),
              }}
            />
          </div>
        ))}
        <hr />
        {pagination && (
          <section className={styles.postPagination}>
            {pagination.prevPage && (
              <span>
                {pagination.prevPage.title}
                <Link href={pagination.prevPage.href}>
                  <a>Post anterior</a>
                </Link>
              </span>
            )}

            {pagination.nextPage && (
              <span className={styles.nextPage}>
                {pagination.nextPage.title}
                <Link href={pagination.nextPage.href}>
                  <a>Próximo post</a>
                </Link>
              </span>
            )}
          </section>
        )}
        <footer ref={commentsSection} />
        {preview && (
          <aside className={styles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>)
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      orderings: '[document.first_publication_date desc]',
      pageSize: 1,
    }
  );

  const slugs = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths: slugs,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData = {},
}) => {
  const { slug } = params;

  const { ref } = previewData;

  const prismic = getPrismicClient();

  const response =
    preview && ref
      ? await prismic.getSingle('posts', { ref })
      : await prismic.getByUID('posts', String(slug), {});

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const post = {
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: item.body,
        };
      }),
    },
    first_publication_date: response.first_publication_date,
    uid: response.uid,
  };

  const {
    results: [prevPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    after: response.id,
    orderings: '[document.first_publication_date desc]',
  });

  const {
    results: [nextPage],
  } = await prismic.query([Prismic.predicates.at('document.type', 'posts')], {
    after: response.id,
    orderings: '[document.first_publication_date]',
  });

  const pagination = {
    nextPage: nextPage
      ? {
        title: nextPage.data.title,
        href: `/post/${nextPage.uid}`,
      }
      : null,
    prevPage: prevPage
      ? {
        title: prevPage.data.title,
        href: `/post/${prevPage.uid}`,
      }
      : null,
  };

  return {
    props: {
      post,
      preview,
      pagination: nextPage || prevPage ? pagination : null,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
