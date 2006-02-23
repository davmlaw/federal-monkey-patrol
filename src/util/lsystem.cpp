// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Feb 21 23:48:56 2006

#include "lsystem.h"
#include "string_util.h"
#include <iostream>

using namespace std;

LSystem::LSystem(const std::string& axiom):
	result(axiom)
{

}

LSystem::LSystem(const std::string& axiom, const strings_t& rules):
	result(axiom)
{
	strings_t::const_iterator i;
	for (i=rules.begin() ; i != rules.end() ; ++i) {
		addRule(*i);
	}
}

void LSystem::addRule(const std::string& rule)
{
	strings_t tmp = split(rule, "->");
	if (tmp.size() != 2) {
		throw exception(("splitting '" + rule + "' on '->' didn't return 2").c_str());
	}

	string from = tmp[0];
	string to	= tmp[1];
	ruleMap[from.c_str()[0]] = to;
}

void LSystem::iterate(int times)
{
	for( int i=0 ; i<times ; ++i) {
		string newResult;
		++iterations;
		const char* str = result.c_str();
		while (char c = *str++) {
			rulemap_t::iterator r;
			if ((r = ruleMap.find(c)) != ruleMap.end()) { // replace
				newResult += r->second;
			} else { // no change to character
				char out[2] = { c, 0 };
				newResult += out;
			}
		}
		result = newResult;
	}
}

