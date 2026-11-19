// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Feb 21 23:48:56 2006
// Thanks Gary William Flake for the book Computational Beauty of Nature
// and sample lsys code (on which this is influenced)

#ifndef LSYSTEM_H
#define LSYSTEM_H

#include "util/string_util.h"
#include <map>

/**
	For more info on L-Systems, see http://en.wikipedia.org/wiki/L-systems
*/
class LSystem {
public:
	LSystem(const std::string& axiom);
	LSystem(const std::string& axiom, const strings_t& rules);
	virtual ~LSystem() { };
	void addRule(const std::string& rule);
	void iterate(int times=1);
	int getIterations(void) {
		return iterations;
	}
	std::string getResult(void) {
		return result;
	}
private:
    // Explicitly disable compiler generated copy functions
    // (allow default copy ctor) LSystem(const LSystem& rhs);
    LSystem& operator=(const LSystem& rhs);
	int iterations;
	std::string result;
	typedef std::map<char,std::string> rulemap_t;
	rulemap_t ruleMap;
};

#endif // LSYSTEM_H
