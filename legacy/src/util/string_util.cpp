// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Fri May 13 00:19:06 2005
// Last modified: Fri May 13 00:19:06 2005

#include "string_util.h"
#include <algorithm>
#include <iostream>
#include <ios>

using namespace std;


// Some Perl-like functions
string uc(const std::string& str)
{
	string s;
	s.resize(str.length());
	transform(str.begin(), str.end(), s.begin(), (int(*)(int)) toupper);
	return s;
}


string lc(const std::string& str)
{
	string s;
	s.resize(str.length());
	transform(str.begin(), str.end(), s.begin(), (int(*)(int)) tolower);
	return s;
}


// take the new line off the end of a string.
void chomp(char *str)
{
	size_t len = strlen(str) - 1;
	if( len >= 0 ) {
		str += len;
		if( *str == '\n' || *str == '\r' )
			*str = '\0';
	}
}


// order of arguments is reversed from perl due to default argument rules.
strings_t split(const string& str, const string& separator)
{
	strings_t v;
	string::size_type i;

	string remaining = str;
	while( (i = remaining.find(separator)) != string::npos ) {
		v.push_back( remaining.substr(0, i) );
		remaining = remaining.substr(i+separator.length());
	}
	v.push_back( remaining );
	return v;
}



void extract_first_rest(string& line, string& first,
						string& rest, string separator)
{
	string::size_type i = line.find(separator);
	first = line.substr(0, i);
	rest = line.substr(i+1);

}



string dircheck(const string& d)
{
	string dir = d;
	if( !dir.empty() ) {
		if( dir[ dir.length()-1 ] != '/' )
			dir += '/';
	}
	return dir;
}

// From String
int stringToInt(const std::string& str)
{
	char *endptr;
	int i = strtol(str.c_str(), &endptr, 0);
	if( endptr == str.c_str() )
		throw string(__FILE__) + ": Couldn't convert '" + str + "' to int";
	return i;    
}

float stringToFloat(const std::string& str)
{
	char *endptr;
	float f = (float)strtod(str.c_str(), &endptr);
	if( endptr == str.c_str() )
		throw string(__FILE__) + ": Couldn't convert '" + str + "' to float";
	return f;
}

bool stringToBool(const std::string& str)
{
	return !str.empty() && str != "false";
}

string floatToString(float f)
{
	return streamToString<float>(f);
}

string intToString(int i)
{
	return streamToString<int>(i);
}

string boolToString(bool b)
{
	return streamToString<bool>(b);
}
