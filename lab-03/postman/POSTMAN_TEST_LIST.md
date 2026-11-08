# Postman test list (Lab 3)

Import `Lab3_Books_API.postman_collection.json`, make sure the server is running, then run the collection (Runner). Each request has automatic tests for status code and `message` field. Base URL variable: `baseUrl` (default `http://localhost:3000`; change it to your live URL).

## Success cases
| ID | Request | Expected |
|----|---------|----------|
| T01 | GET /books | 200, defaults limit=10, offset=0 |
| T02 | GET /books?search_q=code | 200, titles containing "code" |
| T03 | GET /books?order_by=price&order=DESC | 200, highest price first |
| T04 | GET /books?limit=2&offset=1 | 200, max 2 rows |
| T05 | GET /books?min_price=300&max_price=700 | 200, prices in range |
| T06 | GET /books?search_q=the&min_price=100&order_by=title&order=ASC&limit=5&offset=0 | 200, combined filters |
| T07 | POST /books `{title, author, price}` | **201**, returns new id |
| T08 | GET /books/{{bookId}} | 200 |
| T09 | PUT /books/{{bookId}} | **200** |
| T10 | DELETE /books/{{bookId}} | **200** |

## Failure cases
| ID | Request | Expected |
|----|---------|----------|
| T11 | POST without title | 400 `{ "message": ... }` |
| T12 | POST without author | 400 |
| T13 | POST price = "abc" | 400 |
| T14 | POST without price | 400 |
| T15 | POST price = -10 | 400 |
| T16 | POST malformed JSON | 400 |
| T17 | GET /books/99999 | **404** |
| T18 | PUT /books/99999 | 404 |
| T19 | DELETE /books/99999 | 404 |
| T20 | GET /books/abc | 400 |
| T21 | GET /books?order_by=password | 400 |
| T22 | GET /books?order=sideways | 400 |
| T23 | GET /books?limit=abc | 400 |
| T24 | GET /books?min_price=900&max_price=100 | 400 |
| T25 | GET /authors (unknown route) | 404 |

Run T01-T10 in order (T07 saves `bookId` for T08-T10).
