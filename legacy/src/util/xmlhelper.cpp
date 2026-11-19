// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 21:42:17 2005
// Last modified: Sat Jul  2 21:42:17 2005

#include "xmlhelper.h"
#include <iostream>

using namespace std;


XMLDoc::XMLDoc(const string& filename): root(0), doc(0)
{
    xmlKeepBlanksDefault(0);
    doc = xmlParseFile(filename.c_str());
    if (doc)
	root = xmlDocGetRootElement(doc);

    // runs on program exit if any XMLDocs were ever created
    static class Cleanup {
    public:
	~Cleanup() {
	    xmlCleanupParser();
	}
    } c;
}


XMLDoc::~XMLDoc()
{
    xmlFreeDoc(doc);
}


std::ostream& operator<<(std::ostream& stm, const xmlStringValue& sv)
{
    stm << sv.value;
    return stm;
}
