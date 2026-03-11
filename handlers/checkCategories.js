const {DynamoDBClient, ScanCommand,DeleteItemCommand} = require('@aws-sdk/client-dynamodb');
const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns');

const dynamoDBClient = new DynamoDBClient({region: 'us-east-1'});
const snsClient = new SNSClient({region: 'us-east-1'});

exports.checkCategories = async () => {
    try {
        const tableName = process.env.DYNAMODB_TABLE;
        const snsTopicArn = process.env.SNS_TOPIC_ARN;
        
        const oneHourAgo = new Date(Date.now()- 60 *60*1000).toISOString();
        
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#createdAt < :oneHourAgo AND attribute_not_exists(imageUrl)',
            ExpressionAttributeNames: {
                '#createdAt': 'createdAt',
            },
            ExpressionAttributeValues: {
                ":oneHourAgo": { S: oneHourAgo },
            },
        });

        const {Items} = await dynamoDBClient.send(scanCommand);
        
        //If No Items Found, Return Success Response
        if(!Items || Items.length === 0){
            return {
                statusCode: 200,
                body: JSON.stringify({msg: 'No outdated categories to clean up'}),
            }
        }
        const categories = Items.map(item => ({
            fileName: item.fileName.S,
            categoryName: item.categoryName.S,
            imageUrl: item.imageUrl ? item.imageUrl.S : null,
        }));

        
        //Delete Each Outdated Category from DynamoDB
        let deleteCount = 0;
        //Iterate through the retrieved items and delete category and delete to database
        for(const item of Items){
            //Create a delete command unique identifier for each category using fileName as the key
            const deleteItemCommand = new DeleteItemCommand({
                TableName: tableName,
                Key: {fileName: {S: item.fileName.S}}
            });
            //Execute the delete command to remove the category from DynamoDB
            await dynamoDBClient.send(deleteItemCommand);
            deleteCount++;
        }
        
        // SEND SMS NOTIFICATION TO ADMIN ABOUT THE CLEANUP ACTION AFTER DELETING THE OUTDATED CATEGORIES
        const snsMessage = `Category Cleanup Completed: Successfully cleaned up ${deleteCount} outdated categories.`;
        
        await snsClient.send(new PublishCommand({
            TopicArn: snsTopicArn,
            Message: snsMessage,
            Subject: 'Category Cleanup Notification',
        }));
        // Return Success Response with the Count of Deleted Categories
        return {
            statusCode: 200,
            body: JSON.stringify({msg: `Successfully cleaned up ${deleteCount} outdated categories`}),
        }
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify(categories),
           
        // }

    }catch(error){
        console.error('Error fetching categories:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({error: 'TEST IRENE '+error.message}),
        }
    }
}