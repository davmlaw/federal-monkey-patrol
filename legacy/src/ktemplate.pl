#!/usr/bin/perl -w

die "Make a Kong default class file. Usage: $0: CLASSNAME" unless @ARGV;

$class 	   = shift;
$blocker   = uc $class . "_H";
$filename  = lc $class;
die "Files already exist" if -e "$filename.cpp" || -e "$filename.h";

$now = localtime();
$header  = "// (C) David Lawrence released under the GPL (see license.txt)\n";
$header .= "// Started:       $now\n";

open FILE, ">$filename.h" || die "can't open $filename.h: $!";
print FILE<<DONE;
$header
\#ifndef $blocker
\#define $blocker

class $class {
public:
    $class();
    virtual ~$class();
private:
    // Explicitly disable compiler generated copy functions
    $class(const $class& rhs);
    $class& operator=(const $class& rhs);
};

\#endif // $blocker
DONE
close FILE;





open FILE, ">$filename.cpp" || die "can't open $filename.cpp: $!";
print FILE<<DONE;
$header
\#include "$filename.h"

using namespace std;


${class}::$class()
{

}


${class}::~$class()
{

}


DONE
close FILE;
