#include "textfile_reader.h"
#include <fstream>
#include <iostream>
#include <string>


using namespace std;

void TextFileReader::process(void)
{
//    cout << "TextFileReader:process " << filename << endl;

    ifstream from( filename.c_str() );
    if( !from )
	throw string("TextFileReader: can't open \"" + filename + "\"");

    string line;

    while( !from.eof() ) {
	if( !getline( from, line ) ) continue;
	if( line.empty() )           continue;
	if( line[0] == '\r' )        continue;
	if( line[0] == '#' )         continue;

	try {
	    handle_line(line);
	} catch( string& e ) {
	    cout << "TextFileReader Exception: '" << e << "'\n";
	}
    }
}

