<?php
// get_api_key.php
require 'config.php';
header('Content-Type: application/json');
echo json_encode(['apiKey' => GOOGLE_MAPS_API_KEY]);
?>