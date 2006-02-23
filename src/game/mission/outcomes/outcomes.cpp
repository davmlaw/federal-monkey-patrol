// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jul  4 23:00:41 2005
// Last modified: Mon Jul  4 23:00:41 2005
// FIXME: Maybe make some kind of "updateable" abstract class, then make
//        a container class, instead of a new type for outcome?

#include "outcomes.h"
#include "game/mission/mission.h"

using namespace std;


Outcomes::Outcomes(xmlNodePtr node)
{
    xmlNodeList scenariosXML;
    xml_list( node->children, scenariosXML, "scenario" );
    xmlNodeList::iterator i;
    for( i=scenariosXML.begin() ; i != scenariosXML.end() ; ++i ) {
	scenarios.push_back( new Scenario(*i) );
    }
}


Outcomes::~Outcomes()
{
    scenario_list_t::iterator i;
    for( i=scenarios.begin() ; i != scenarios.end() ; ++i ) {
	delete *i;
    }
}


void Outcomes::update(Mission* mission)
{
    scenario_list_t::iterator i;
    for( i=scenarios.begin() ; i != scenarios.end() ; ++i ) {
	(*i)->run(mission);
    }
}
