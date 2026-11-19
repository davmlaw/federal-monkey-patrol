// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Fri May 13 00:19:06 2005
// Last modified: Fri May 13 00:19:06 2005

#ifndef STRING_UTIL
#define STRING_UTIL

#include <string>
#include <vector>
#include <sstream>

typedef std::vector<std::string> strings_t;

std::string uc(const std::string& str);
std::string lc(const std::string& str);
void chomp(char *str);
strings_t split(const std::string& str, const std::string& separator = " ");
void extract_first_rest(std::string& line, std::string& first,
			std::string& rest, std::string separator = " ");
std::string dircheck(const std::string& dir);

int     stringToInt(const std::string& str);
float stringToFloat(const std::string& str);
bool   stringToBool(const std::string& str);

template<class T>
std::string streamToString(T obj)
{
	ostringstream ss;
	ss << obj;
	return ss.str();
}

std::string floatToString(float f);
std::string intToString(int i);
std::string boolToString(bool b);

#endif // STRING_UTIL
