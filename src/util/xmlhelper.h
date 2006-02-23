// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 21:42:17 2005
// Last modified: Sat Jul  2 21:42:17 2005

#ifndef XMLHELPER_H
#define XMLHELPER_H

#include "string_util.h"
#include <libxml/tree.h>
#include <libxml/parser.h>
#include <string>
#include <map>
#include <list>
#include <iostream>


class XMLDoc {
public:
	XMLDoc(const std::string& filename);
	~XMLDoc();
	xmlNodePtr root;
private:
	xmlDocPtr doc;
};


template<class N, class T>
void xml_map(N node, std::map<std::string,T>& ht)
{
	for( ; node ; node = node->next ) {
		std::string strname = lc( (const char*)node->name );
		if( strname != "comment" )
			ht[strname] = T(node);
	}
}


template<class N, class T>
void xml_list(N node, std::list<T>& lt, const std::string& name = "*" )
{
	bool wild = (name == "*");

	for( ; node ; node = node->next ) {
		std::string strname = lc( (const char*)node->name );
		if( (wild || strname == lc(name)) && strname != "comment" ) {
			lt.push_back( T(node) );
		}
	}
}


// string value of an XML node.
class xmlStringValue {
public:
	xmlStringValue() { };
	template<class N> xmlStringValue(const N node) {
		if( node ) {
			xmlChar* c = xmlNodeListGetString(node->doc, node->children, 1);
			if( c ) {
				value = (char*)c;
				xmlFree(c);
			} else {
				std::cout << "XML ERROR: "
					<< node->name << " has no text value\n";
			}
		}
	}
	operator std::string() const {
		return value;
	}
	std::string value;
};
std::ostream& operator<<(std::ostream& stm, const xmlStringValue& sv);

typedef std::map<std::string,xmlNodePtr>     xmlNodeMap;
typedef std::map<std::string,xmlStringValue> xmlStringMap;
typedef std::list<xmlNodePtr>                xmlNodeList;
typedef std::list<xmlStringValue>            xmlStringList;

#endif // XMLHELPER_H
