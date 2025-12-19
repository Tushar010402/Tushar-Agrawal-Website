---
title: "AWS Services for Backend Developers: Complete Infrastructure Guide"
description: "Master essential AWS services for backend development including EC2, Lambda, S3, RDS, DynamoDB, SQS, SNS, API Gateway, and CloudFormation. Learn cloud architecture patterns and best practices."
date: "2024-12-16"
author: "Tushar Agrawal"
tags: ["AWS", "Cloud", "Backend", "Lambda", "S3", "RDS", "DynamoDB", "Infrastructure", "DevOps"]
image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Amazon Web Services (AWS) offers 200+ services, but backend developers typically use a core set of 15-20 services regularly. This guide covers the essential AWS services every backend developer should master, with practical examples and architecture patterns.

## Compute Services

### EC2 (Elastic Compute Cloud)

Virtual servers for running applications.

```python
# boto3 example: Launch EC2 instance
import boto3

ec2 = boto3.resource('ec2', region_name='us-east-1')

instance = ec2.create_instances(
    ImageId='ami-0c55b159cbfafe1f0',  # Amazon Linux 2
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1,
    KeyName='my-key-pair',
    SecurityGroupIds=['sg-12345678'],
    SubnetId='subnet-12345678',
    IamInstanceProfile={
        'Name': 'MyEC2Role'
    },
    TagSpecifications=[{
        'ResourceType': 'instance',
        'Tags': [
            {'Key': 'Name', 'Value': 'web-server-1'},
            {'Key': 'Environment', 'Value': 'production'}
        ]
    }],
    UserData='''#!/bin/bash
    yum update -y
    yum install -y docker
    systemctl start docker
    docker pull myapp:latest
    docker run -d -p 80:8000 myapp:latest
    '''
)[0]

print(f"Instance ID: {instance.id}")

# Wait for instance to be running
instance.wait_until_running()
instance.reload()
print(f"Public IP: {instance.public_ip_address}")
```

### Lambda (Serverless Functions)

Run code without managing servers.

```python
# lambda_function.py
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Orders')

def lambda_handler(event, context):
    """
    Process incoming order from API Gateway
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        # Validate required fields
        required_fields = ['customer_id', 'items', 'total']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f'Missing field: {field}'})
                }

        # Create order
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        order = {
            'order_id': order_id,
            'customer_id': body['customer_id'],
            'items': body['items'],
            'total': body['total'],
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }

        # Save to DynamoDB
        table.put_item(Item=order)

        # Trigger notification
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789:OrderNotifications',
            Message=json.dumps({
                'order_id': order_id,
                'customer_id': body['customer_id'],
                'total': body['total']
            }),
            Subject='New Order Created'
        )

        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'order_id': order_id,
                'status': 'created'
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
```

```yaml
# serverless.yml (Serverless Framework)
service: order-service

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  environment:
    ORDERS_TABLE: ${self:service}-orders-${sls:stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:Query
          Resource: arn:aws:dynamodb:${aws:region}:*:table/${self:provider.environment.ORDERS_TABLE}
        - Effect: Allow
          Action:
            - sns:Publish
          Resource: arn:aws:sns:${aws:region}:*:OrderNotifications

functions:
  createOrder:
    handler: handler.lambda_handler
    events:
      - http:
          path: orders
          method: post
          cors: true
    memorySize: 256
    timeout: 10

resources:
  Resources:
    OrdersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.ORDERS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: order_id
            AttributeType: S
          - AttributeName: customer_id
            AttributeType: S
        KeySchema:
          - AttributeName: order_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: CustomerIndex
            KeySchema:
              - AttributeName: customer_id
                KeyType: HASH
            Projection:
              ProjectionType: ALL
```

### ECS/Fargate (Container Orchestration)

Run Docker containers at scale.

```yaml
# task-definition.json
{
  "family": "api-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/api:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:db-credentials"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

## Storage Services

### S3 (Simple Storage Service)

Object storage for files, backups, static assets.

```python
import boto3
from botocore.exceptions import ClientError
import mimetypes

class S3Storage:
    def __init__(self, bucket_name: str):
        self.s3 = boto3.client('s3')
        self.bucket = bucket_name

    def upload_file(self, file_path: str, object_key: str) -> str:
        """Upload file to S3 and return URL"""
        content_type, _ = mimetypes.guess_type(file_path)

        try:
            self.s3.upload_file(
                file_path,
                self.bucket,
                object_key,
                ExtraArgs={
                    'ContentType': content_type or 'application/octet-stream',
                    'ACL': 'private'
                }
            )
            return f"s3://{self.bucket}/{object_key}"
        except ClientError as e:
            raise Exception(f"Upload failed: {e}")

    def generate_presigned_url(self, object_key: str, expiration: int = 3600) -> str:
        """Generate presigned URL for temporary access"""
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': object_key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate URL: {e}")

    def generate_presigned_post(self, object_key: str, max_size_mb: int = 10) -> dict:
        """Generate presigned POST for direct browser uploads"""
        try:
            response = self.s3.generate_presigned_post(
                self.bucket,
                object_key,
                Fields=None,
                Conditions=[
                    ["content-length-range", 0, max_size_mb * 1024 * 1024]
                ],
                ExpiresIn=3600
            )
            return response
        except ClientError as e:
            raise Exception(f"Failed to generate presigned POST: {e}")

    def list_objects(self, prefix: str = "") -> list:
        """List objects with optional prefix filter"""
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix
            )
            return [obj['Key'] for obj in response.get('Contents', [])]
        except ClientError as e:
            raise Exception(f"Failed to list objects: {e}")

    def delete_object(self, object_key: str) -> None:
        """Delete object from S3"""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=object_key)
        except ClientError as e:
            raise Exception(f"Delete failed: {e}")


# Usage
storage = S3Storage('my-app-bucket')

# Upload file
storage.upload_file('/tmp/report.pdf', 'reports/2024/report.pdf')

# Generate download link
url = storage.generate_presigned_url('reports/2024/report.pdf', expiration=86400)

# Direct browser upload
post_data = storage.generate_presigned_post('uploads/user-123/avatar.jpg')
# Return post_data to frontend for direct upload
```

## Database Services

### RDS (Relational Database Service)

Managed PostgreSQL, MySQL, and more.

```python
import boto3
import psycopg2
from contextlib import contextmanager

# Create RDS instance programmatically
def create_rds_instance():
    rds = boto3.client('rds')

    response = rds.create_db_instance(
        DBInstanceIdentifier='myapp-db',
        DBInstanceClass='db.t3.medium',
        Engine='postgres',
        EngineVersion='15.4',
        MasterUsername='admin',
        MasterUserPassword='securepassword123',  # Use Secrets Manager!
        AllocatedStorage=100,
        StorageType='gp3',
        StorageEncrypted=True,
        MultiAZ=True,  # High availability
        PubliclyAccessible=False,
        VpcSecurityGroupIds=['sg-12345678'],
        DBSubnetGroupName='my-subnet-group',
        BackupRetentionPeriod=7,
        EnablePerformanceInsights=True,
        Tags=[
            {'Key': 'Environment', 'Value': 'production'},
            {'Key': 'Application', 'Value': 'myapp'}
        ]
    )

    return response['DBInstance']['DBInstanceIdentifier']


# Connect using IAM authentication
def get_rds_connection():
    """Get database connection using IAM auth"""
    rds_client = boto3.client('rds')

    # Generate auth token
    token = rds_client.generate_db_auth_token(
        DBHostname='myapp-db.cluster-xyz.us-east-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='app_user',
        Region='us-east-1'
    )

    conn = psycopg2.connect(
        host='myapp-db.cluster-xyz.us-east-1.rds.amazonaws.com',
        port=5432,
        database='myapp',
        user='app_user',
        password=token,
        sslmode='require'
    )

    return conn


@contextmanager
def db_connection():
    """Context manager for database connections"""
    conn = get_rds_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Usage
with db_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE active = %s", (True,))
        users = cur.fetchall()
```

### DynamoDB (NoSQL Database)

Serverless, scalable NoSQL database.

```python
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
import json

class DynamoDBRepository:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)

    def create(self, item: dict) -> dict:
        """Create new item"""
        # Convert floats to Decimal for DynamoDB
        item = json.loads(json.dumps(item), parse_float=Decimal)
        self.table.put_item(Item=item)
        return item

    def get_by_id(self, pk: str, sk: str = None) -> dict:
        """Get item by primary key"""
        key = {'pk': pk}
        if sk:
            key['sk'] = sk

        response = self.table.get_item(Key=key)
        return response.get('Item')

    def query_by_partition(
        self,
        pk: str,
        sk_prefix: str = None,
        limit: int = 100
    ) -> list:
        """Query items by partition key with optional sort key prefix"""
        key_condition = Key('pk').eq(pk)

        if sk_prefix:
            key_condition = key_condition & Key('sk').begins_with(sk_prefix)

        response = self.table.query(
            KeyConditionExpression=key_condition,
            Limit=limit
        )

        return response.get('Items', [])

    def query_gsi(
        self,
        index_name: str,
        pk_value: str,
        sk_value: str = None
    ) -> list:
        """Query Global Secondary Index"""
        key_condition = Key('gsi_pk').eq(pk_value)

        if sk_value:
            key_condition = key_condition & Key('gsi_sk').eq(sk_value)

        response = self.table.query(
            IndexName=index_name,
            KeyConditionExpression=key_condition
        )

        return response.get('Items', [])

    def update(self, pk: str, sk: str, updates: dict) -> dict:
        """Update item attributes"""
        update_expression = "SET "
        expression_values = {}
        expression_names = {}

        for i, (key, value) in enumerate(updates.items()):
            update_expression += f"#attr{i} = :val{i}, "
            expression_names[f"#attr{i}"] = key
            expression_values[f":val{i}"] = value

        update_expression = update_expression.rstrip(", ")

        response = self.table.update_item(
            Key={'pk': pk, 'sk': sk},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )

        return response.get('Attributes')

    def delete(self, pk: str, sk: str) -> None:
        """Delete item"""
        self.table.delete_item(Key={'pk': pk, 'sk': sk})

    def batch_write(self, items: list) -> None:
        """Batch write up to 25 items"""
        with self.table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)

    def transact_write(self, operations: list) -> None:
        """Transactional write for multiple items"""
        client = boto3.client('dynamodb')
        client.transact_write_items(TransactItems=operations)


# Single Table Design Example
class OrderRepository(DynamoDBRepository):
    """
    Single table design for Orders
    PK: USER#<user_id>
    SK: ORDER#<order_id> or ITEM#<item_id>
    """

    def create_order(self, user_id: str, order_id: str, items: list) -> None:
        """Create order with items in transaction"""
        operations = []

        # Order record
        operations.append({
            'Put': {
                'TableName': self.table.name,
                'Item': {
                    'pk': {'S': f'USER#{user_id}'},
                    'sk': {'S': f'ORDER#{order_id}'},
                    'status': {'S': 'pending'},
                    'total': {'N': str(sum(i['price'] * i['quantity'] for i in items))},
                    'gsi_pk': {'S': f'ORDER#{order_id}'},
                    'gsi_sk': {'S': f'USER#{user_id}'}
                }
            }
        })

        # Order items
        for item in items:
            operations.append({
                'Put': {
                    'TableName': self.table.name,
                    'Item': {
                        'pk': {'S': f'ORDER#{order_id}'},
                        'sk': {'S': f'ITEM#{item["product_id"]}'},
                        'quantity': {'N': str(item['quantity'])},
                        'price': {'N': str(item['price'])}
                    }
                }
            })

        self.transact_write(operations)

    def get_user_orders(self, user_id: str) -> list:
        """Get all orders for user"""
        return self.query_by_partition(
            pk=f'USER#{user_id}',
            sk_prefix='ORDER#'
        )

    def get_order_items(self, order_id: str) -> list:
        """Get all items for order"""
        return self.query_by_partition(
            pk=f'ORDER#{order_id}',
            sk_prefix='ITEM#'
        )
```

## Messaging Services

### SQS (Simple Queue Service)

Message queuing for async processing.

```python
import boto3
import json
from dataclasses import dataclass
from typing import Callable, Any

@dataclass
class Message:
    id: str
    body: dict
    receipt_handle: str
    attributes: dict

class SQSQueue:
    def __init__(self, queue_url: str):
        self.sqs = boto3.client('sqs')
        self.queue_url = queue_url

    def send_message(self, body: dict, delay_seconds: int = 0) -> str:
        """Send message to queue"""
        response = self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(body),
            DelaySeconds=delay_seconds
        )
        return response['MessageId']

    def send_batch(self, messages: list[dict]) -> dict:
        """Send batch of messages (max 10)"""
        entries = [
            {
                'Id': str(i),
                'MessageBody': json.dumps(msg)
            }
            for i, msg in enumerate(messages)
        ]

        response = self.sqs.send_message_batch(
            QueueUrl=self.queue_url,
            Entries=entries
        )

        return {
            'successful': len(response.get('Successful', [])),
            'failed': len(response.get('Failed', []))
        }

    def receive_messages(
        self,
        max_messages: int = 10,
        wait_time: int = 20,
        visibility_timeout: int = 30
    ) -> list[Message]:
        """Receive messages from queue"""
        response = self.sqs.receive_message(
            QueueUrl=self.queue_url,
            MaxNumberOfMessages=max_messages,
            WaitTimeSeconds=wait_time,
            VisibilityTimeout=visibility_timeout,
            AttributeNames=['All']
        )

        messages = []
        for msg in response.get('Messages', []):
            messages.append(Message(
                id=msg['MessageId'],
                body=json.loads(msg['Body']),
                receipt_handle=msg['ReceiptHandle'],
                attributes=msg.get('Attributes', {})
            ))

        return messages

    def delete_message(self, receipt_handle: str) -> None:
        """Delete processed message"""
        self.sqs.delete_message(
            QueueUrl=self.queue_url,
            ReceiptHandle=receipt_handle
        )

    def delete_batch(self, receipt_handles: list[str]) -> None:
        """Delete batch of messages"""
        entries = [
            {'Id': str(i), 'ReceiptHandle': handle}
            for i, handle in enumerate(receipt_handles)
        ]

        self.sqs.delete_message_batch(
            QueueUrl=self.queue_url,
            Entries=entries
        )


class SQSWorker:
    """Worker to process SQS messages"""

    def __init__(self, queue: SQSQueue, handler: Callable[[dict], Any]):
        self.queue = queue
        self.handler = handler
        self.running = False

    def start(self):
        """Start processing messages"""
        self.running = True
        print("Worker started, listening for messages...")

        while self.running:
            messages = self.queue.receive_messages()

            for message in messages:
                try:
                    print(f"Processing message: {message.id}")
                    self.handler(message.body)
                    self.queue.delete_message(message.receipt_handle)
                    print(f"Message {message.id} processed successfully")
                except Exception as e:
                    print(f"Error processing message {message.id}: {e}")
                    # Message will become visible again after timeout

    def stop(self):
        """Stop worker gracefully"""
        self.running = False


# Usage
def process_order(order_data: dict):
    """Handler for order processing"""
    print(f"Processing order: {order_data['order_id']}")
    # Process the order...

queue = SQSQueue('https://sqs.us-east-1.amazonaws.com/123456789/orders')
worker = SQSWorker(queue, process_order)
worker.start()
```

### SNS (Simple Notification Service)

Pub/Sub messaging for notifications.

```python
import boto3
import json

class SNSPublisher:
    def __init__(self, topic_arn: str):
        self.sns = boto3.client('sns')
        self.topic_arn = topic_arn

    def publish(
        self,
        message: dict,
        subject: str = None,
        attributes: dict = None
    ) -> str:
        """Publish message to topic"""
        params = {
            'TopicArn': self.topic_arn,
            'Message': json.dumps(message)
        }

        if subject:
            params['Subject'] = subject

        if attributes:
            params['MessageAttributes'] = {
                key: {
                    'DataType': 'String',
                    'StringValue': str(value)
                }
                for key, value in attributes.items()
            }

        response = self.sns.publish(**params)
        return response['MessageId']

    def publish_with_filter(
        self,
        message: dict,
        event_type: str
    ) -> str:
        """Publish with filter attributes for subscriber filtering"""
        return self.publish(
            message=message,
            attributes={'event_type': event_type}
        )


# Event-driven architecture example
class EventPublisher:
    """Publish domain events to SNS"""

    def __init__(self):
        self.sns = boto3.client('sns')
        self.topics = {
            'orders': 'arn:aws:sns:us-east-1:123456789:order-events',
            'users': 'arn:aws:sns:us-east-1:123456789:user-events',
            'payments': 'arn:aws:sns:us-east-1:123456789:payment-events'
        }

    def publish_event(
        self,
        domain: str,
        event_type: str,
        payload: dict
    ) -> str:
        """Publish domain event"""
        topic_arn = self.topics.get(domain)
        if not topic_arn:
            raise ValueError(f"Unknown domain: {domain}")

        message = {
            'event_type': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'payload': payload
        }

        response = self.sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps(message),
            MessageAttributes={
                'event_type': {
                    'DataType': 'String',
                    'StringValue': event_type
                }
            }
        )

        return response['MessageId']


# Usage
events = EventPublisher()
events.publish_event(
    domain='orders',
    event_type='order.created',
    payload={
        'order_id': 'ORD-123',
        'customer_id': 'CUST-456',
        'total': 99.99
    }
)
```

## API Gateway

Create REST and WebSocket APIs.

```yaml
# SAM template (template.yaml)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: python3.11
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref OrdersTable

Resources:
  # REST API
  OrdersApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  # Lambda Functions
  CreateOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/orders.create
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref OrdersApi
            Path: /orders
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable

  GetOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/orders.get
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref OrdersApi
            Path: /orders/{orderId}
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref OrdersTable

  ListOrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/orders.list
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref OrdersApi
            Path: /orders
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref OrdersTable

  # DynamoDB Table
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE

  # Cognito User Pool
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: orders-user-pool
      AutoVerifiedAttributes:
        - email
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true
          RequireUppercase: true

Outputs:
  ApiEndpoint:
    Value: !Sub "https://${OrdersApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

## Infrastructure as Code

### CloudFormation/CDK

```python
# CDK Example (Python)
from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_elasticache as elasticache,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    Duration,
    RemovalPolicy,
)
from constructs import Construct

class BackendStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # VPC
        vpc = ec2.Vpc(
            self, "BackendVPC",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Isolated",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ]
        )

        # RDS PostgreSQL
        db_security_group = ec2.SecurityGroup(
            self, "DBSecurityGroup",
            vpc=vpc,
            description="Security group for RDS"
        )

        database = rds.DatabaseInstance(
            self, "Database",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15_4
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            ),
            security_groups=[db_security_group],
            multi_az=True,
            storage_encrypted=True,
            deletion_protection=True,
            backup_retention=Duration.days(7)
        )

        # ElastiCache Redis
        cache_security_group = ec2.SecurityGroup(
            self, "CacheSecurityGroup",
            vpc=vpc,
            description="Security group for ElastiCache"
        )

        cache_subnet_group = elasticache.CfnSubnetGroup(
            self, "CacheSubnetGroup",
            description="Subnet group for Redis",
            subnet_ids=[
                subnet.subnet_id
                for subnet in vpc.isolated_subnets
            ]
        )

        redis = elasticache.CfnCacheCluster(
            self, "RedisCluster",
            cache_node_type="cache.t3.micro",
            engine="redis",
            num_cache_nodes=1,
            cache_subnet_group_name=cache_subnet_group.ref,
            vpc_security_group_ids=[cache_security_group.security_group_id]
        )

        # Lambda Function
        api_handler = _lambda.Function(
            self, "ApiHandler",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.main",
            code=_lambda.Code.from_asset("lambda"),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            environment={
                "DB_HOST": database.db_instance_endpoint_address,
                "REDIS_HOST": redis.attr_redis_endpoint_address
            },
            timeout=Duration.seconds(30)
        )

        # Allow Lambda to connect to RDS
        db_security_group.add_ingress_rule(
            peer=api_handler.connections.security_groups[0],
            connection=ec2.Port.tcp(5432)
        )

        # API Gateway
        api = apigw.RestApi(
            self, "BackendApi",
            rest_api_name="Backend API"
        )

        api.root.add_method(
            "GET",
            apigw.LambdaIntegration(api_handler)
        )
```

## Best Practices

### 1. Security

```python
# Use Secrets Manager for sensitive data
import boto3

def get_secret(secret_name: str) -> dict:
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Never hardcode credentials
db_creds = get_secret('prod/db/credentials')
connection = psycopg2.connect(
    host=db_creds['host'],
    user=db_creds['username'],
    password=db_creds['password']
)
```

### 2. Cost Optimization

```yaml
# Use spot instances for non-critical workloads
Resources:
  SpotFleet:
    Type: AWS::EC2::SpotFleet
    Properties:
      SpotFleetRequestConfigData:
        AllocationStrategy: lowestPrice
        TargetCapacity: 10
        LaunchSpecifications:
          - InstanceType: t3.medium
            SpotPrice: "0.02"
```

### 3. Monitoring

```python
# CloudWatch custom metrics
import boto3

cloudwatch = boto3.client('cloudwatch')

def put_metric(name: str, value: float, unit: str = 'Count'):
    cloudwatch.put_metric_data(
        Namespace='MyApp',
        MetricData=[{
            'MetricName': name,
            'Value': value,
            'Unit': unit,
            'Dimensions': [
                {'Name': 'Environment', 'Value': 'production'}
            ]
        }]
    )

# Track business metrics
put_metric('OrdersCreated', 1)
put_metric('OrderValue', 99.99, 'None')
put_metric('ProcessingTime', 250, 'Milliseconds')
```

## Conclusion

Mastering these AWS services enables you to build scalable, reliable backend systems. Start with the basics (EC2, S3, RDS), then progress to serverless (Lambda, DynamoDB) and event-driven architectures (SQS, SNS).

---

*Building on AWS? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss cloud architecture and best practices.*

## Related Articles

- [Docker & Kubernetes Deployment Guide](/blog/docker-kubernetes-deployment-guide) - Container orchestration on AWS
- [System Design Interview Guide](/blog/system-design-interview-guide) - Design cloud-native systems
- [PostgreSQL Performance Optimization](/blog/postgresql-performance-optimization) - Optimize RDS databases
- [Redis Caching Strategies Complete Guide](/blog/redis-caching-strategies-complete-guide) - ElastiCache patterns
- [GitHub Actions CI/CD Complete Guide](/blog/github-actions-cicd-complete-guide) - Deploy to AWS with CI/CD
