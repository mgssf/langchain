import pg from "pg";
import { VectorStore } from "./base.js";
import { Document } from "../document.js";
import { getEnvironmentVariable } from "../util/env.js";
/**
 * Class that provides an interface to a Postgres vector database. It
 * extends the `VectorStore` base class and implements methods for adding
 * documents and vectors, performing similarity searches, and ensuring the
 * existence of a table in the database.
 */
export class PGVectorStore extends VectorStore {
    _vectorstoreType() {
        return "pgvector";
    }
    constructor(embeddings, config) {
        super(embeddings, config);
        Object.defineProperty(this, "tableName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectionTableName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectionName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "langchain"
        });
        Object.defineProperty(this, "collectionMetadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "idColumnName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "vectorColumnName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "contentColumnName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "metadataColumnName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "filter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_verbose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "chunkSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 500
        });
        this.tableName = config.tableName;
        this.collectionTableName = config.collectionTableName;
        this.collectionName = config.collectionName ?? "langchain";
        this.collectionMetadata = config.collectionMetadata ?? null;
        this.filter = config.filter;
        this.vectorColumnName = config.columns?.vectorColumnName ?? "embedding";
        this.contentColumnName = config.columns?.contentColumnName ?? "text";
        this.idColumnName = config.columns?.idColumnName ?? "id";
        this.metadataColumnName = config.columns?.metadataColumnName ?? "metadata";
        const pool = new pg.Pool(config.postgresConnectionOptions);
        this.pool = pool;
        this.chunkSize = config.chunkSize ?? 500;
        this._verbose =
            getEnvironmentVariable("LANGCHAIN_VERBOSE") === "true" ??
                !!config.verbose;
    }
    /**
     * Static method to create a new `PGVectorStore` instance from a
     * connection. It creates a table if one does not exist, and calls
     * `connect` to return a new instance of `PGVectorStore`.
     *
     * @param embeddings - Embeddings instance.
     * @param fields - `PGVectorStoreArgs` instance.
     * @returns A new instance of `PGVectorStore`.
     */
    static async initialize(embeddings, config) {
        const postgresqlVectorStore = new PGVectorStore(embeddings, config);
        await postgresqlVectorStore._initializeClient();
        await postgresqlVectorStore.ensureTableInDatabase();
        if (postgresqlVectorStore.collectionTableName) {
            await postgresqlVectorStore.ensureCollectionTableInDatabase();
        }
        return postgresqlVectorStore;
    }
    async _initializeClient() {
        this.client = await this.pool.connect();
    }
    /**
     * Method to add documents to the vector store. It converts the documents into
     * vectors, and adds them to the store.
     *
     * @param documents - Array of `Document` instances.
     * @returns Promise that resolves when the documents have been added.
     */
    async addDocuments(documents) {
        const texts = documents.map(({ pageContent }) => pageContent);
        return this.addVectors(await this.embeddings.embedDocuments(texts), documents);
    }
    /**
     * Inserts a row for the collectionName provided at initialization if it does not
     * exist and returns the collectionId.
     *
     * @returns The collectionId for the given collectionName.
     */
    async getOrCreateCollection() {
        const queryString = `
      SELECT uuid from ${this.collectionTableName}
      WHERE name = $1;
    `;
        const queryResult = await this.pool.query(queryString, [
            this.collectionName,
        ]);
        let collectionId = queryResult.rows[0]?.uuid;
        if (!collectionId) {
            const insertString = `
        INSERT INTO ${this.collectionTableName}(
          uuid,
          name,
          cmetadata
        )
        VALUES (
          uuid_generate_v4(),
          $1,
          $2
        )
        RETURNING uuid;
      `;
            const insertResult = await this.pool.query(insertString, [
                this.collectionName,
                this.collectionMetadata,
            ]);
            collectionId = insertResult.rows[0]?.uuid;
        }
        return collectionId;
    }
    /**
     * Generates the SQL placeholders for a specific row at the provided index.
     *
     * @param index - The index of the row for which placeholders need to be generated.
     * @param numOfColumns - The number of columns we are inserting data into.
     * @returns The SQL placeholders for the row values.
     */
    generatePlaceholderForRowAt(index, numOfColumns) {
        const placeholders = [];
        for (let i = 0; i < numOfColumns; i += 1) {
            placeholders.push(`$${index * numOfColumns + i + 1}`);
        }
        return `(${placeholders.join(", ")})`;
    }
    /**
     * Constructs the SQL query for inserting rows into the specified table.
     *
     * @param rows - The rows of data to be inserted, consisting of values and records.
     * @param chunkIndex - The starting index for generating query placeholders based on chunk positioning.
     * @returns The complete SQL INSERT INTO query string.
     */
    async buildInsertQuery(rows) {
        let collectionId;
        if (this.collectionTableName) {
            collectionId = await this.getOrCreateCollection();
        }
        const columns = [
            this.contentColumnName,
            this.vectorColumnName,
            this.metadataColumnName,
        ];
        if (collectionId) {
            columns.push("collection_id");
        }
        const valuesPlaceholders = rows
            .map((_, j) => this.generatePlaceholderForRowAt(j, columns.length))
            .join(", ");
        const text = `
      INSERT INTO ${this.tableName}(
        ${columns}
      )
      VALUES ${valuesPlaceholders}
    `;
        return text;
    }
    /**
     * Method to add vectors to the vector store. It converts the vectors into
     * rows and inserts them into the database.
     *
     * @param vectors - Array of vectors.
     * @param documents - Array of `Document` instances.
     * @returns Promise that resolves when the vectors have been added.
     */
    async addVectors(vectors, documents) {
        const rows = [];
        let collectionId;
        if (this.collectionTableName) {
            collectionId = await this.getOrCreateCollection();
        }
        for (let i = 0; i < vectors.length; i += 1) {
            const values = [];
            const embedding = vectors[i];
            const embeddingString = `[${embedding.join(",")}]`;
            values.push(documents[i].pageContent, embeddingString, documents[i].metadata);
            if (collectionId) {
                values.push(collectionId);
            }
            rows.push(values);
        }
        for (let i = 0; i < rows.length; i += this.chunkSize) {
            const chunk = rows.slice(i, i + this.chunkSize);
            const insertQuery = await this.buildInsertQuery(chunk);
            const flatValues = chunk.flat();
            try {
                await this.pool.query(insertQuery, flatValues);
            }
            catch (e) {
                console.error(e);
                throw new Error(`Error inserting: ${e.message}`);
            }
        }
    }
    /**
     * Method to perform a similarity search in the vector store. It returns
     * the `k` most similar documents to the query vector, along with their
     * similarity scores.
     *
     * @param query - Query vector.
     * @param k - Number of most similar documents to return.
     * @param filter - Optional filter to apply to the search.
     * @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
     */
    async similaritySearchVectorWithScore(query, k, filter) {
        const embeddingString = `[${query.join(",")}]`;
        const _filter = filter ?? "{}";
        let collectionId;
        if (this.collectionTableName) {
            collectionId = await this.getOrCreateCollection();
        }
        const parameters = [embeddingString, _filter, k];
        if (collectionId) {
            parameters.push(collectionId);
        }
        const queryString = `
      SELECT *, ${this.vectorColumnName} <=> $1 as "_distance"
      FROM ${this.tableName}
      WHERE ${this.metadataColumnName}::jsonb @> $2
      ${collectionId ? "AND collection_id = $4" : ""}
      ORDER BY "_distance" ASC
      LIMIT $3;
    `;
        const documents = (await this.pool.query(queryString, parameters)).rows;
        const results = [];
        for (const doc of documents) {
            if (doc._distance != null && doc[this.contentColumnName] != null) {
                const document = new Document({
                    pageContent: doc[this.contentColumnName],
                    metadata: doc[this.metadataColumnName],
                });
                results.push([document, doc._distance]);
            }
        }
        return results;
    }
    /**
     * Method to ensure the existence of the table in the database. It creates
     * the table if it does not already exist.
     *
     * @returns Promise that resolves when the table has been ensured.
     */
    async ensureTableInDatabase() {
        await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        "${this.idColumnName}" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "${this.contentColumnName}" text,
        "${this.metadataColumnName}" jsonb,
        "${this.vectorColumnName}" vector
      );
    `);
    }
    /**
     * Method to ensure the existence of the collection table in the database.
     * It creates the table if it does not already exist.
     *
     * @returns Promise that resolves when the collection table has been ensured.
     */
    async ensureCollectionTableInDatabase() {
        try {
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.collectionTableName} (
          uuid uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          name character varying,
          cmetadata jsonb
        );

        ALTER TABLE ${this.tableName}
          ADD COLUMN collection_id uuid;

        ALTER TABLE ${this.tableName}
          ADD CONSTRAINT ${this.tableName}_collection_id_fkey
          FOREIGN KEY (collection_id)
          REFERENCES ${this.collectionTableName}(uuid)
          ON DELETE CASCADE;
      `);
        }
        catch (e) {
            if (!e.message.includes("already exists")) {
                console.error(e);
                throw new Error(`Error adding column: ${e.message}`);
            }
        }
    }
    /**
     * Static method to create a new `PGVectorStore` instance from an
     * array of texts and their metadata. It converts the texts into
     * `Document` instances and adds them to the store.
     *
     * @param texts - Array of texts.
     * @param metadatas - Array of metadata objects or a single metadata object.
     * @param embeddings - Embeddings instance.
     * @param dbConfig - `PGVectorStoreArgs` instance.
     * @returns Promise that resolves with a new instance of `PGVectorStore`.
     */
    static async fromTexts(texts, metadatas, embeddings, dbConfig) {
        const docs = [];
        for (let i = 0; i < texts.length; i += 1) {
            const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
            const newDoc = new Document({
                pageContent: texts[i],
                metadata,
            });
            docs.push(newDoc);
        }
        return PGVectorStore.fromDocuments(docs, embeddings, dbConfig);
    }
    /**
     * Static method to create a new `PGVectorStore` instance from an
     * array of `Document` instances. It adds the documents to the store.
     *
     * @param docs - Array of `Document` instances.
     * @param embeddings - Embeddings instance.
     * @param dbConfig - `PGVectorStoreArgs` instance.
     * @returns Promise that resolves with a new instance of `PGVectorStore`.
     */
    static async fromDocuments(docs, embeddings, dbConfig) {
        const instance = await PGVectorStore.initialize(embeddings, dbConfig);
        await instance.addDocuments(docs);
        return instance;
    }
    /**
     * Closes all the clients in the pool and terminates the pool.
     *
     * @returns Promise that resolves when all clients are closed and the pool is terminated.
     */
    async end() {
        this.client?.release();
        return this.pool.end();
    }
}
