// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 08 May 2004

#include "util.h"
#include <iostream>

using namespace std;


/* Wrapped up in ERR_QUIT(str, status) which adds the version, file and line
   from the program in which it was called */
void err_quit(string message, int status, string version,string file,int line)
{

    cout << "FATAL ERROR (\"" << file
	 << " (" << line << ") \": "
	 << message << " [STATUS=" << status << "]" << endl;  
    
    exit(status);
    
}


// From Cube:
// little indians as storage format
void endianswap(void *memory, int stride, int length)
{
    if(*((char *)&stride)) return;
    for(int w=0 ; w < length ; w++ )
	for( int i=0 ; i<stride/2 ; i++ ) {
	    unsigned char *p = (unsigned char *)memory+w*stride;
	    unsigned char t = p[i];
	    p[i] = p[stride-i-1];
	    p[stride-i-1] = t;
	}
}
