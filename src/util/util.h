// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 02 Jul 2004

#ifndef UTIL_H
#define UTIL_H

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

#include <string>
#include <math.h>
#include "../kong.h" // for VERSION

#define ERR_QUIT(a,b) err_quit(a, b, VERSION, __FILE__, __LINE__);
// <algorithm> on linux and windows.h define a nice min() and max() template
// but I can't find one on mac. bah.
#define MAX(a,b) (a>b? a : b)
#define MIN(a,b) (a<b? a : b)

void err_quit(std::string message, int status,
	      std::string version, std::string file, int line);
void endianswap(void *memory, int stride, int length);

template<class T> T clamp(T minimum, T val, T maximum) {
    val = MAX(minimum, val);
    val = MIN(maximum, val);
    return val;
}

inline int nearlyequals(float a, float b, float theta=0.01f) {
    return ( fabs(a-b) < theta );
}


template<class T>
bool eval(T a, const std::string& op, T b)
{
    if( op == "<"  || op == "lt"  ) return a <  b;
    if( op == "<=" || op == "lte" ) return a <= b;
    if( op == "==" || op == "eq"  ) return a == b;
    if( op == ">=" || op == "gte" ) return a >= b;
    if( op == ">"  || op == "gt"  ) return a >  b;
    return false;
}


#endif
