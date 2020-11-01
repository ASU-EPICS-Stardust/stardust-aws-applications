The AWS Stacks can be deployed using cloudformation through the [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy/index.html)

## Serverless
The template.yaml file is a sam serverless template file and can be deployed using the same cli or toolkit plugin for
 your IDE.
 
Deployment command: 
```
sam package -t template.yaml --output-template-file "template-packaged.yaml" --s3-bucket "stardust-cloudformation-templates" --config-file "samconfig.toml" --config-env "default"
sam deploy -t template-packaged.yaml --s3-bucket "stardust-cloudformation-templates" --config-file "samconfig.toml" --config-env "default"
```

## AppSyncPackage Debug
```
sam deploy -t AppSyncStack.yaml --s3-bucket "stardust-cloudformation-templates" --stack-name "AppSyncStack" --capabilities CAPABILITY_NAMED_IAM --region "us-east-2" --parameter-overrides "AppSyncAPILoggingLevel=\"ERROR\" AppSyncLoggingExcludeVerbose=\"true\" UserPoolStack=\"UserPool-Dev\" IrradianceCalcLambdaFunctionArn=\"arn:aws:lambda:us-east-2:502015339777:function:Stardust-CalculateIrradiance-IrradianceFunc-1UNYVLACZRKTA\" DegradationCalcLambdaFunctionArn=\"arn:aws:lambda:us-east-2:502015339777:function:Stardust-CalculateIrradiance-DegradationFunc-9PGBUS09Y87L\" " 
```

## Cognito User Pool
The Cognito User Pool is a separate stack to be built apart from the others.
```
sam deploy -t CognitoUserPoolStack.yaml --stack-name "UserPool-Dev" --s3-bucket "stardust-cloudformation-templates" --capabilities CAPABILITY_NAMED_IAM --region us-east-2 --confirm-changeset True --parameter-overrides "SignInDomain=pv-degradation-pool-dev"
```

## CloudFormation Macro
This template only has to be deployed once to enable the macro in the us-east-2 region. The macro is used to generate a random id in the AppSyncStack
```
sam deploy -t CloudFormationMacros.yaml --stack-name "Macros" --s3-bucket "stardust-cloudformation-templates" --capabilities CAPABILITY_NAMED_IAM --region us-east-2 --confirm-changeset True
```

