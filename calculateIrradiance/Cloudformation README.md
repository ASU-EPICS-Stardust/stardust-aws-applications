The AWS Resource Stacks can be deployed using cloudformation through the [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy/index.html) or the SAM CLI. The SAM commands for each stack are given below.

## Serverless Resources (main template)
The template.yaml file is a sam serverless template file and can be deployed using the same cli or toolkit plugin for
 your IDE.
 
Deployment command: 
```
sam package -t template.yaml --output-template-file "template-packaged.yaml" --s3-bucket "stardust-cloudformation-templates" --config-file "samconfig.toml" --config-env "default"
sam deploy -t template-packaged.yaml --s3-bucket "stardust-cloudformation-templates" --config-file "samconfig.toml" --config-env "default"
```

## Cognito User Pool
The Cognito User Pool is a separate stack to be built apart from the others.
```
sam deploy -t CognitoUserPoolStack.yaml --stack-name "UserPool-Dev" --s3-bucket "stardust-cloudformation-templates" --capabilities CAPABILITY_NAMED_IAM --region us-east-2 --confirm-changeset True --parameter-overrides "SignInDomain=pv-degradation-pool-dev"
```

## CloudFormation Macro
This template only has to be deployed once to enable the macro in the us-east-2 region. The macro is used to generate a random id in template.yaml.
```
sam deploy -t CloudFormationMacros.yaml --stack-name "Macros" --s3-bucket "stardust-cloudformation-templates" --capabilities CAPABILITY_NAMED_IAM --region us-east-2 --confirm-changeset True
```

