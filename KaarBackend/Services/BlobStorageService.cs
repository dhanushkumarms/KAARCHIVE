using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using System;
using System.Threading.Tasks;

namespace KaarBackend.Services
{
    public class BlobStorageService
    {
        private readonly BlobServiceClient _blobServiceClient;

        public BlobStorageService(string connectionString)
        {
            _blobServiceClient = new BlobServiceClient(connectionString);
        }

        // Get the BlobContainerClient for a specific container
        public BlobContainerClient GetBlobContainerClient(string containerName)
        {
            return _blobServiceClient.GetBlobContainerClient(containerName);
        }

        // Ensure that the container exists. If not, create it
        public async Task EnsureContainerExistsAsync(string containerName)
        {
            try
            {
                var containerClient = GetBlobContainerClient(containerName);

                if (!await containerClient.ExistsAsync())
                {
                    await containerClient.CreateAsync(PublicAccessType.None);  // Ensures files are private
                    Console.WriteLine($"Container '{containerName}' created successfully.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error ensuring container exists: {ex.Message}");
                throw;
            }
        }
    }
}
