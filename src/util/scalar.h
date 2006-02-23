// (C) David Lawrence released under the GPL (see license.txt)
// Started:       19 Dec 2004
// Last modified: 19 Dec 2004

#ifndef SCALAR_H
#define SCALAR_H

#include <string>
#include <stdlib.h>

#include "util/string_util.h"

/**
 * Can be float/int/string
 * Really bad class to subvert type system
 * Keeps things internally as a string.
 * I was going to use the Boost Variant type with a static_visitor but the
 * libraries are so big, it would be a trouble for people to compile kong.
 */
class Scalar {
public:
    Scalar() { };
    Scalar(std::string a) { str = a; };
    Scalar& operator=(const std::string& a) {
	str = a;
	return *this;
    };
    virtual ~Scalar() { };

    operator std::string() const {
	return str;
    };
    operator int() const {
	return stringToInt(str);
    };
    operator float() const {
	return stringToFloat(str);
    };
private:
    std::string str;
};


#endif
