import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
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
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  function handleSumReadTime(): number {
    const countWordsBody = RichText.asText(
      post.data.content.reduce((acc, item) => [...acc, ...item.body], [])
    ).split(' ').length;

    const countWordsTitle = post.data.content.reduce((acc, item) => {
      if (item?.heading) return [...acc, ...item.heading.split(' ')];

      return acc;
    }, []).length;

    return Math.ceil((countWordsBody + countWordsTitle) / 200);
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | SpaceTraveling</title>
      </Head>

      <main className={styles.container}>
        <img src={post.data.banner.url} alt={post.data.title} />

        <article className={commonStyles.content}>
          <header>
            <h1 className={styles.title}>{post.data.title}</h1>

            <div>
              <span>
                <FiCalendar />
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
              <span>
                <FiUser />
                {post.data.author}
              </span>
              <span>
                <FiClock /> {handleSumReadTime()} min
              </span>
            </div>
          </header>

          {post.data.content.map(({ heading, body }) => (
            <section key={heading}>
              <h2>{heading}</h2>

              <div
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
              />
            </section>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(({ uid }) => ({
    params: {
      slug: uid,
    },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  if (!response) {
    return {
      notFound: true,
    };
  }

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      content: response.data.content,
      banner: {
        url: response.data.banner.url,
      },
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
