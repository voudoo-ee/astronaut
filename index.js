import { Router } from "itty-router";
import { connect } from "@planetscale/database";

const config = {
  host: DB_HOST,
  username: DB_USERNAME,
  password: DB_PASSWORD,
};

const router = Router({ base: "/api/v1" });
const conn = connect(config);
const SELECT_SELECTOR =
  "ID, name, ean, store, price, brand, is_discount, is_age_restricted, weight, unit_price, url, category, image_url, price_difference_float, price_difference_percentage";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

router.get("/get_fuzzy/:query", async ({ params }) => {
  const results = await conn.execute(
    "SELECT " +
      SELECT_SELECTOR +
      " FROM Matches WHERE MATCH(name, brand) AGAINST(?) LIMIT ?",
    [params.query, FUZZY_RESULT_LIMIT]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.get("/get_random/:count", async ({ params }) => {
  const RANDOM_COUNT = parseInt(params.count);
  if (RANDOM_COUNT > 25) {
    return new Response("Too many results requested.", { status: 400 });
  }

  const results = await conn.execute(
    "SELECT " +
      SELECT_SELECTOR +
      " FROM Matches JOIN (SELECT (SELECT MAX(ID) FROM Matches WHERE price_difference_percentage > 10) * RAND() AS rand_id) r" +
      " WHERE ID >= r.rand_id AND price_difference_percentage > 10" +
      " ORDER BY ID ASC " +
      "LIMIT ?",
    [RANDOM_COUNT]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.get("/get_ean/:ean/:store", async ({ params }) => {
  const results = await conn.execute(
    "SELECT " +
      SELECT_SELECTOR +
      ", disregard" +
      " FROM Products WHERE (ean = ? AND store = ?) LIMIT 1",
    [params.ean, params.store]
  );
  return new Response(JSON.stringify(results["rows"]), { headers: HEADERS });
});

router.get("/add_missing/:ean/:store", async ({ params }) => {
  await conn.execute("INSERT IGNORE INTO Missing (ean, store) VALUES (?, ?)", [
    params.ean,
    params.store,
  ]);
  await conn.execute("COMMIT;");
  return new Response("OK!", { headers: HEADERS, status: 200 });
});

router.get("/status", async () => {
  return new Response("OK!", { headers: HEADERS, status: 200 });
});

router.all("*", () => new Response("Not Found.", { status: 404 }));

addEventListener("fetch", (event) =>
  event.respondWith(router.handle(event.request))
);
