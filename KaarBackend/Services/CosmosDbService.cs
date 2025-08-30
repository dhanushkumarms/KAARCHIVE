using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace KaarBackend.Services
{
    public class CosmosDbService
    {
        private readonly CosmosClient _cosmosClient;
        private readonly Container _container;

        public CosmosDbService(string account, string key, string databaseName, string containerName)
        {
            var clientOptions = new CosmosClientOptions
            {
                // This ensures that property names are converted to camelCase
                SerializerOptions = new CosmosSerializationOptions
                {
                    PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
                }
            };

            _cosmosClient = new CosmosClient(account, key, clientOptions);

            // Create database and container if they don't exist
            var databaseResponse = _cosmosClient.CreateDatabaseIfNotExistsAsync(databaseName).GetAwaiter().GetResult();
            databaseResponse.Database.CreateContainerIfNotExistsAsync(containerName, "/id").GetAwaiter().GetResult();

            _container = _cosmosClient.GetContainer(databaseName, containerName);
        }

        public async Task AddDocumentAsync<T>(T document)
        {
            await _container.CreateItemAsync(document);
        }

        public async Task<T> GetDocumentAsync<T>(string id)
        {
            try
            {
                var response = await _container.ReadItemAsync<T>(id, new PartitionKey(id));
                return response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return default;
            }
        }

        public async Task UpdateDocumentAsync<T>(string id, T document)
        {
            await _container.UpsertItemAsync(document, new PartitionKey(id));
        }

        public async Task<IEnumerable<T>> QueryDocumentsAsync<T>(Expression<Func<T, bool>> predicate)
        {
            var query = _container.GetItemLinqQueryable<T>()
                .Where(predicate)
                .ToFeedIterator();

            var results = new List<T>();
            while (query.HasMoreResults)
            {
                var response = await query.ReadNextAsync();
                results.AddRange(response);
            }

            return results;
        }
    }
}
