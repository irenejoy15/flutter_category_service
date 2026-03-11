const {DynamoDBClient, ScanCommand} = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({region: 'us-east-1'});

exports.getAllCategories = async (event) => {
    try {
        const tableName = process.env.DYNAMODB_TABLE;
        const scanCommand = new ScanCommand({ TableName: tableName });
        const {Items} = await dynamoDBClient.send(scanCommand);
        if(!Items || Items.length === 0){
            return {
                statusCode: 404,
                body: JSON.stringify({error: 'No categories found'}),
            }
        }
        // const categories = Items.map(item => item.imageUrl.S);
        const categories = Items.map(item => ({
            categoryName: item.categoryName.S,
            imageUrl: item.imageUrl.S,
        }));
        return {
            statusCode: 200,
            body: JSON.stringify(categories),
        }
    }catch(error){
        console.error('Error fetching categories:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({error: error.message}),
        }
    }
}