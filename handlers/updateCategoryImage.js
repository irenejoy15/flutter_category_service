const {DynamoDBClient, UpdateItemCommand} = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({region: 'us-east-1'});

exports.updateCategoryImage = async (event) => {
    try {
        const tableName = process.env.DYNAMODB_TABLE;
        const  recordId  = event.Records[0];

        //Get the bucket name and file name from the S3 event
        const bucketName = recordId.s3.bucket.name;
        // Extract the file name from the S3 event
        const fileName = recordId.s3.object.key;
        // Construct a public URL on how the uploaded image can be accessed
        const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
        // Prepare the parameters for updating the DynamoDB record
        new UpdateItemCommand({
            TableName : tableName,
            Key:{
                fileName: { S: fileName },
            },
            UpdateExpression: 'SET imageUrl = :imageUrl',
            ExpressionAttributeValues: {
                ':imageUrl': { S: imageUrl },
            },
        });
        await dynamoDBClient.send(UpdateItemCommand);
        return {
            statusCode: 200,
            body: JSON.stringify({msg: 'Category image updated successfully'}),
        }
    }catch (error) {
        console.error('Error updating category image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({error: error.message}),
        }
    }
};