output "function_url" {
  description = "Invocable URL for the Confluence automation handler"
  value       = aws_lambda_function_url.handler.function_url
}
