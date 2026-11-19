// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Mar 10 23:25:47 2005
// Last modified: Thu Mar 10 23:25:47 2005

#include "togglefloat.h"
#include "util/string_util.h"

using namespace std;

ToggleFloat::ToggleFloat(float in_min, float in_max, float in_mod):
    min(in_min),
    max(in_max),
    value(0),
    modifier(in_mod)
{

}


string ToggleFloat::getTextValue(void)
{
	return floatToString(value);
}


void ToggleFloat::setTextValue(const std::string& val)
{
    value = stringToFloat(val);
}
