<?php
	error_reporting(0);
	$url = $_GET["url"];
	$pagenumber = 1;
	//$url = "http://www.drpayas.com/sitemap.xml";
	$file = fopen ($url, "r");
	if (!$file) {
	    echo "[\"Error\"]";
	    exit;
	}

	echo "[";
	while (!feof ($file)) {
	    $line = fgets ($file, 1024);
	    /* This only works if the loc and its tags are on one line */
	    if (preg_match ("@\<loc\>(.*)\</loc\>@i", $line, $out)) {
		    echo "\"".$out[1]."\",";
	    }
	}
	echo "\"\"]";
	fclose($file);
	exit;
?>