import useTranslation from "next-translate/useTranslation";
import { GetStaticPaths, GetStaticProps } from "next";
import { stringify } from "qs";

import Seo from "../../../components/elements/seo";
import Layout from "../../../components/layout";
import BlogDetailHero from "../../../components/sections/blog-detail-hero";

import Image from "../../../components/common/image";
import Text from "../../../components/common/text";
import RichText from "../../../components/common/rich-text";
import CustomLink from "../../../components/common/custom-link";
import ShareSocials from "../../../components/sections/share-socials";

import { fetchAPI, getLocale } from "../../../utils/api";
import popularLocales from "../../../i18n/popularLocales.json";

const LocalArticle = ({ article }) => {
  const { title, image } = article;
  return (
    <div className="blog-article-related-item">
      <div className="blog-article-related-item-cover">
        <Image className="blog-article-related-item-image" img={image} />
      </div>
      <Text
        className="blog-article-related-item-title"
        color="black"
        weight="bold"
      >
        {title}
      </Text>
    </div>
  );
};

const LocalArticleDetail = ({ article, relatedArticles, t }) => {
  const { content, image, topics } = article;

  return (
    <div className="container flex flex-col">
      <div className="flex flex-col items-center mb-16">
        <Image img={image} className="mb-9" style={{ maxHeight: 500 }} />
        <RichText className="container" children={content} />
      </div>

      <div className="mb-16">
        <ShareSocials types={["facebook", "telegram"]} />
      </div>

      {topics?.length > 0 && (
        <div className="flex flex-col">
          <Text className="mb-6" size="medium" weight="bold" color="black">
            {t("common:articleTopics")}
          </Text>
          <div className="flex flex-row flex-wrap">
            {topics.map((topic: any) => (
              <CustomLink
                key={topic.id}
                link={{ url: `/blog/topic/${topic.slug}` }}
              >
                <div
                  className="py-4 px-14 mr-2 mb-2"
                  style={{ border: "1px solid #000000", borderRadius: "2px" }}
                >
                  <Text size="medium" color="black" weight="semiBold">
                    {topic.topic}
                  </Text>
                </div>
              </CustomLink>
            ))}
          </div>
        </div>
      )}

      {relatedArticles?.length > 0 && (
        <div className="blog-article-related">
          <Text
            className="blog-article-related-title"
            size="medium"
            weight="bold"
            color="black"
          >
            {t("common:articleRelated")}
          </Text>
          <div className="blog-article-related-items">
            {relatedArticles.map((article: any) => (
              <CustomLink
                key={article.id}
                link={{ url: `/blog/article/${article.slug}` }}
              >
                <LocalArticle article={article} />
              </CustomLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Article = ({ article, relatedArticles, metadata, global }) => {
  const { t } = useTranslation();

  const Hero = () => <BlogDetailHero article={article} />;

  return (
    <>
      <Seo
        metadata={metadata}
        seoData={{ type: "blog-post", data: article }}
        globalSeoData={global.defaultSeo}
      />
      <Layout Hero={Hero} global={global} mainClass="bg-white">
        <LocalArticleDetail
          article={article}
          relatedArticles={relatedArticles}
          t={t}
        />
      </Layout>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const articles = await fetchAPI("/articles?status=published");

  return {
    paths: articles
      ? articles.reduce((acc: any, article: any) => {
          return acc.concat(
            popularLocales.map((locale) => ({
              params: {
                slug: article.slug,
              },
              locale,
            }))
          );
        }, [])
      : [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async (ctx) => {
  const { params } = ctx;
  const locale = getLocale(ctx);
  const [article, page] = await Promise.all([
    fetchAPI(`/articles/${params.slug}?status=published&_locale=${locale}`),
    fetchAPI(`/pages/blog?_locale=${locale}&status=published`),
  ]);

  if (!article) {
    return { notFound: true };
  }

  const metadata = article
    ? article.metadata
      ? {
          ...article.metadata,
          metaTitleTemplate: page?.seo?.metaTitleTemplate || "%s",
        }
      : {
          metaTitle: article?.title || "",
          metaDescription: article?.description || "",
          metaTitleTemplate: page?.seo?.metaTitleTemplate || "%s",
          sharedImage: article?.image || {},
        }
    : null;

  let relatedArticles = [];

  if (article?.relatedArticles?.random === false) {
    relatedArticles = article.relatedArticles.articles;
  } else if (article) {
    const query = stringify({
      id_nin: article.id,
      status: "published",
      _locale: locale,
      _limit: 3,
      "topics.id_in": article.topics.map((topic: any) => topic.id),
    });
    relatedArticles = await fetchAPI(`/articles?${query}`);
  }

  return {
    props: { article, relatedArticles, metadata },
    revalidate: 1, // redo SSG in the background
  };
};

export default Article;
