<?php

error_reporting(0);

$code = 'null';

$url = $_GET["url"];

$options['http'] = array(
    'method' => "HEAD",
    'ignore_errors' => 1,
);

$context = stream_context_create($options);

$body = file_get_contents($url, NULL, $context);

if (count($http_response_header) > 0 ){
    $responses = parse_http_response_header($http_response_header);
    $code = $responses[0]['status']['code']; // last status codes
}else{
    echo '{"code":"null","note":""}';
    return;
}

$number = count($responses);

$redirects = $number - 1;

if ($redirects)
{
    $from = $url;
    $path;

    foreach (array_reverse($responses) as $response)
    {
        if (!isset($response['fields']['LOCATION']))
            break;
        $location = $response['fields']['LOCATION'];
        $code = $response['status']['code'];

        $path = $path."$from -- $code --> $location <br>";
        $from = $location;
    }
    echo '{"code":"'.$code.'","note":"'.$path.'"}';
}else{
    echo '{"code":"'.$code.'","note":""}';
}

/**
 * parse_http_response_header
 *
 * @param array $headers as in $http_response_header
 * @return array status and headers grouped by response, last first
 */
function parse_http_response_header(array $headers)
{
    $responses = array();
    $buffer = NULL;
    foreach ($headers as $header)
    {
        if ('HTTP/' === substr($header, 0, 5))
        {
            // add buffer on top of all responses
            if ($buffer) array_unshift($responses, $buffer);
            $buffer = array();

            list($version, $code, $phrase) = explode(' ', $header, 3) + array('', FALSE, '');

            $buffer['status'] = array(
                'line' => $header,
                'version' => $version,
                'code' => (int) $code,
                'phrase' => $phrase
            );
            $fields = &$buffer['fields'];
            $fields = array();
            continue;
        }
        list($name, $value) = explode(': ', $header, 2) + array('', '');
        // header-names are case insensitive
        $name = strtoupper($name);
        // values of multiple fields with the same name are normalized into
        // a comma separated list (HTTP/1.0+1.1)
        if (isset($fields[$name]))
        {
            $value = $fields[$name].','.$value;
        }
        $fields[$name] = $value;
    }
    unset($fields); // remove reference
    array_unshift($responses, $buffer);

    return $responses;
}

?>