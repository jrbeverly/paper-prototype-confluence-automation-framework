variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "slack_webhook_url" {
  description = "Slack incoming webhook URL supplied to the Lambda as SLACK_WEBHOOK_URL"
  type        = string
  sensitive   = true
}
