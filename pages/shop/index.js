import React, { useEffect, useState } from "react";
import CardSkeleton from "../../components/cardskeleton";
import Layout from "../../components/layout";
import ProductCard from "../../components/productcard";
import { useSelector } from "react-redux";
import { recentCategory } from "../../slices/categorySlice";
import Head from "next/head";

export async function getStaticProps() {
  const API_URL = process.env.NEXT_PUBLIC_APIURL || "http://localhost:1337";

  let data = [];
  let dataTypes = [];
  let dataItems = [];

  try {
    const res = await fetch(`${API_URL}/categories`);
    data = await res.json();
  } catch (err) {
    console.error("Failed to fetch categories:", err.message);
  }

  try {
    const resTypes = await fetch(`${API_URL}/types`);
    dataTypes = await resTypes.json();
  } catch (err) {
    console.error("Failed to fetch types:", err.message);
  }

  try {
    const resItems = await fetch(
      `${API_URL}/items?_sort=published_at:DESC`
    );
    dataItems = await resItems.json();
  } catch (err) {
    console.error("Failed to fetch items:", err.message);
  }

  return {
    props: {
      data,
      dataItems,
      dataTypes,
    },
    revalidate: 5,
  };
}

function Category({ data, dataItems, dataTypes }) {
  const [sort, setSort] = useState(0);
  const recent_category = useSelector(recentCategory);
  const data_items = dataItems
    .filter((item) => {
      if (recent_category.length > 0) {
        return item.type.name == recent_category;
      } else {
        return true;
      }
    })
    .sort((a, b) => {
      if (sort === 1) {
        return a.price - b.price;
      }
      if (sort === 2) {
        return b.price - a.price;
      }
      return true;
    });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <>
      <Head>
        <title>mssofjhgt.shop | Shop</title>
      </Head>
      <Layout categories={data} setSort={setSort} types={dataTypes}>
        {!loading ? (
          data_items.length < 1 ? (
            <p className="col-span-full mx-auto text-sm text-gray-400">
              No item found
            </p>
          ) : (
            data_items.map((item) => (
              <ProductCard key={item.slug} item={item} />
            ))
          )
        ) : (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
      </Layout>
    </>
  );
}

export default Category;
