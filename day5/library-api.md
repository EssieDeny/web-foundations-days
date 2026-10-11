# Library Books REST API Design

Base URL: `https://api.example.com`

The API manages books in a library. Each book has an ID, title,
author, publication year, and ISBN.

## Endpoints

### 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** 200 OK
- **Request body:** None

Example request:

http
GET /books

### 2. Get one book

- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns details of a book with the specified ID.
- **Success status:** 200 OK
- **Request body:** None

Example request:

http
GET /books/42

### 3. Create a book

- **Method:** POST
- **Path:** `/books`
- **Description:** Creates a new book in the library.
- **Success status:** 201 Created

Example request body:

json
{
"title": "The Great Gatsby",
"author": "F. Scott Fitzgerald",
"publicationYear": 1925,
"isbn": "9780743273565"
}

### 4. Update a book

- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Success status:** 200 OK

Example request:

http
PUT /books/42

Example request body:

json
{
"title": "The Great Gatsby",
"author": "F. Scott Fitzgerald",
"publicationYear": 1925,
"isbn": "9780743273565"
}

### 5. Delete a book

- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Deletes the book with the specified ID.
- **Success status:** 204 No Content
- **Request body:** None

Example request:

http
DELETE /books/42

### 6. List books by author

- **Method:** GET
- **Path:** `/books?author=F.%20Scott%20Fitzgerald`
- **Description:** Returns books written by the specified author using a query parameter.
- **Success status:** 200 OK
- **Request body:** None

Example request:

http
GET /books?author=F.%20Scott%20Fitzgerald

## Error Responses

### 400 Bad Request

Returned when the client sends invalid data or a malformed request.

Example: Creating a book without a required title or with an invalid
publication year.

### 404 Not Found

Returned when the requested resource does not exist.

Example: Requesting `GET /books/9999` when no book with ID 9999 exists.

## Summary

- GET retrieves resources.
- POST creates a resource.
- PUT replaces an existing resource.
- DELETE removes a resource.
- Query parameters filter collections.
- 200 means OK, 201 means Created, and 204 means successful completion
  with no response body.
