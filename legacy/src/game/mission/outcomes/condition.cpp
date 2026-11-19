// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Jul 20 00:32:15 2005

#include "condition.h"
#include "game/mission/outcomes/comparator.h"
#include "game/mission/gamestatistics.h"
#include "util/string_util.h"
#include <iostream>

using namespace std;
using namespace condition_space;

extern GameStatistics gamestats;


// Ant disease
Condition* condition_space::ConditionBuilder(xmlNodePtr node)
{
    Condition* cond = 0;
    string name = lc((char*)node->name);

    if( name == "not" ) {
	cond = new Not( ConditionBuilder(node->children) );
    } else if( name == "stat" ) {
	try {
	    xmlStringMap xs;
	    xml_map( node->properties, xs );

	    stats_t s = GameStatistics::statFromName( xs["name"] );
	    string op = xs["op"];
	    unsigned int val = stringToInt( xs["value"] );
	    if( s != NOSUCHSTAT && !op.empty() ) {
		//cout << GameStatistics::statName(s) << op << val << endl;
		cond = new Comparator(&gamestats, s, op, val);
	    }
	} catch (...) {
	    cout << "Bad Stat property read.\n";
	}
    } else {
	NAryCondition* ncond;
	if( name == "and" )
	    ncond = new And();
	else if( name == "or" )
	    ncond = new Or();
	else {
	    cout << "Unknown condition '" << name << "' read\n";
	    return 0;
	}

	xmlNodeList nl;
	xml_list( node->children, nl);
	xmlNodeList::iterator i;
	for( i=nl.begin() ; i != nl.end() ; ++i ) {
	    ncond->add( ConditionBuilder( *i ) );
	}
	cond = ncond;
    }

    return cond;
}


// NOT
Not::Not(Condition* c):
    child(c)
{

}

Not::~Not() {
    delete child;
}

bool Not::isTrue(void)
{
    return !child->isTrue();
}


NAryCondition::~NAryCondition()
{
    condition_list_t::iterator i;
    for( i=conditions.begin() ; i != conditions.end() ; ++i ) {
	delete *i;
    }
}

void NAryCondition::add(Condition* c)
{
    conditions.push_back(c);
}


bool And::isTrue(void)
{
    bool result = true;
    condition_list_t::iterator i;
    for( i=conditions.begin() ; i != conditions.end() ; ++i ) {
	result &= (*i)->isTrue();
    }
    return result;
}


bool Or::isTrue(void)
{
    bool result = false;
    condition_list_t::iterator i;
    for( i=conditions.begin() ; i != conditions.end() ; ++i ) {
	result |= (*i)->isTrue();
    }
    return result;
}
