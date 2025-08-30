using KaarBackend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register services
var connectionString = builder.Configuration["BlobStorage:ConnectionString"];
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Azure Blob Storage connection string is missing.");
}

// Register BlobStorageService with the connection string
builder.Services.AddSingleton(new BlobStorageService(connectionString));


// 🔹 Read Cosmos DB settings from appsettings.json
var cosmosAccount = builder.Configuration["CosmosDb:Account"];
var cosmosKey = builder.Configuration["CosmosDb:Key"];
var cosmosDatabaseName = builder.Configuration["CosmosDb:DatabaseName"];
var cosmosContainerName = builder.Configuration["CosmosDb:ContainerName"]; 

// 🔹 Validate Cosmos DB settings
if (string.IsNullOrEmpty(cosmosAccount) || string.IsNullOrEmpty(cosmosKey) ||
    string.IsNullOrEmpty(cosmosDatabaseName) || string.IsNullOrEmpty(cosmosContainerName))
{
    throw new InvalidOperationException("Cosmos DB configuration is missing in appsettings.json.");
}

builder.Services.AddSingleton<CosmosDbService>(provider =>
    new CosmosDbService(cosmosAccount, cosmosKey, cosmosDatabaseName, cosmosContainerName)
);

// 🔹 Read Azurite (local storage) connection string from appsettings.json
var azuriteConnectionString = builder.Configuration["AzureBlob:ConnectionString"] 
                            ?? "UseDevelopmentStorage=true"; // ✅ Default for Azurite

if (string.IsNullOrEmpty(azuriteConnectionString))
{
    throw new InvalidOperationException("Azure Blob Storage connection string is missing.");
}

// Register ChatService with ChatPdf dependency
builder.Services.AddSingleton<ChatService>(provider => {
    var cosmosDbService = provider.GetRequiredService<CosmosDbService>();
    var chatPdfService = provider.GetRequiredService<ChatPdfService>();
    return new ChatService(cosmosDbService, chatPdfService);
});

// Register ChatPDF Service with API key
string chatPdfApiKey = builder.Configuration["ChatPdf:ApiKey"] ?? "sec_ex79XqU1YSm22KxUqf8ZWMvt7kuzzg7s";
builder.Services.AddSingleton(new ChatPdfService(chatPdfApiKey));

// JWT Authentication
var secretKey = builder.Configuration["Jwt:Secret"] ?? "default_secret_key";
var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<JwtService>();

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policyBuilder =>
    {
        policyBuilder.AllowAnyOrigin()
                     .AllowAnyMethod()
                     .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

