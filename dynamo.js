import aws from "aws-sdk";
const { config, DynamoDB } = aws;
config.loadFromPath("./config/aws_config.json");
const docClient = new DynamoDB.DocumentClient();
import { plainTextSend } from "./utils.js";

const tableName = "slackTimeBot";

const getUserData = (userId) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :PK and SK = :SK",
      ExpressionAttributeValues: {
        ":PK": userId,
        ":SK": "status",
      },
    };
    docClient.query(params, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

const putUserData = (message) => {
  const params = {
    TableName: tableName,
    Item: {
      PK: message.user,
      SK: "status",
      status: 1,
      timeStamp: Math.floor(message.event_ts),
      stopTime: 0,
      stopTimeCalc: 0,
    },
  };
  docClient.put(params, (err, data) => {
    if (err) {
      plainTextSend("에러");
      return;
    }

    plainTextSend(`:computer: 공부를 시작했습니다`);
  });
};

export { getUserData, putUserData };
