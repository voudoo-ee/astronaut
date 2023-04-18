import { Router } from "itty-router";
import { connect } from "@planetscale/database";

const config = {
  host: DB_HOST,
  username: DB_USERNAME,
  password: DB_PASSWORD,
};

const API_VER = "/api/v1/";
const router = Router();
const conn = connect(config);
const SELECTOR =
  "ID, name, ean, store, price, brand, is_discount, is_age_restricted, weight, unit_price, url, category, image_url, price_difference_float, price_difference_percentage";
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

router.get(API_VER + "get_fuzzy/:query", async ({ params }) => {
  const results = await conn.execute(
    "SELECT " +
      SELECTOR +
      " FROM Matches WHERE MATCH(name, brand) AGAINST(?) LIMIT ?",
    [params.query, FUZZY_RESULT_LIMIT]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.get(API_VER + "get_random/:count", async ({ params }) => {
  const RANDOM_COUNT = parseInt(params.count);
  if (RANDOM_COUNT > 25) {
    return new Response("Too many results requested.", { status: 400 });
  }

  const results = await conn.execute(
    "SELECT " +
      SELECTOR +
      " FROM Matches WHERE price_difference_percentage > 10 ORDER BY RAND() LIMIT ?",
    [RANDOM_COUNT]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.get(API_VER + "get_ean/:ean", async ({ params }) => {
  const results = await conn.execute(
    "SELECT " +
      SELECTOR +
      ", disregard" +
      " FROM Products WHERE ean = ? LIMIT 1",
    [params.ean]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.all("*", () => new Response("Not Found.", { status: 404 }));

addEventListener("fetch", (event) =>
  event.respondWith(router.handle(event.request))
);
