<?php
//
//                >>>  EasyLibs.php  <<<
//
//
//      [Version]     v1.6  (2015-10-28)  Beta
//
//      [Based on]    PHP v5.3+
//
//      [Usage]       A Light-weight PHP Class Library
//                    without PHP Extensions.
//
//
//            (C)2015    shiy2008@gmail.com
//

// -----------------------------------
//
//    File System Node Object  v0.3
//
// -----------------------------------

abstract class FS_Node {
    public $type;
    public $URI;

    abstract protected function create($_Access_Auth);
    abstract public function delete();
    abstract public function copyTo($_Target);

    public function moveTo($_URI) {
        return  rename($this->URI, $_URI);
    }

    static protected function realPath($_Path) {
        $_Path = realpath($_Path);
        return  (substr($_Path, -1) == DIRECTORY_SEPARATOR)  ?  substr($_Path, 0, -1) : $_Path;
    }

    public function __construct($_URI, $_Access_Auth = 0777) {
        $this->URI = $_URI;
        $this->type = is_dir($_URI) ? 0 : 1;

        if (! file_exists($_URI))  $this->create($_Access_Auth);

        $this->URI = self::realPath($_URI);
    }
    public function __toString() {
        return $this->URI;
    }
}
class FS_Directory extends FS_Node {
    protected function create($_Access_Auth) {
        return  mkdir($this->URI, $_Access_Auth, true);
    }
    public function traverse() {
        $_Args = func_get_args();

        if (! ($_Args[0] instanceof Closure)) {
            $_Mode = $_Args[0];
            $_Callback = $_Args[1];
        } else
            $_Callback = $_Args[0];

        foreach (
            new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($this->URI, FilesystemIterator::SKIP_DOTS),
                isset($_Mode) ? $_Mode : 0
            ) as
            $_Name => $_File
        )
            if (call_user_func($_Callback, $_Name, $_File)  ===  false)
                break;
    }
    public function delete() {
        $this->traverse(2,  function ($_Name, $_File) {
            $_URI = $_File->getRealPath();
            //  Let SplFileObject release the file,
            //  so that Internal Functions can use it.
            $_File = null;

            is_file($_URI) ? unlink($_URI) : rmdir($_URI);
        });

        return rmdir($this->URI);
    }
    public function copyTo($_Target) {
        $_Target = self::realPath($_Target);

        $this->traverse(2,  function ($_Name, $_File) use ($_Target) {
            $_Name = $_Target.DIRECTORY_SEPARATOR.$_Name;
            $_URI = $_File->getRealPath();
            $_File = null;

            if ( is_dir($_URI) )
                return  mkdir($_Name, 0777, true);

            if (! file_exists($_Name))
                mkdir(dirname($_Name), 0777, true);
            copy($_URI, $_Name);
        });
    }
}
class FS_File extends FS_Node {
    public function readAll() {
        return  file_get_contents($this->URI);
    }
    public function write($_Data) {
        return  file_put_contents($this->URI, $_Data);
    }
    protected function create($_Access_Auth) {
        return  $this->write('');
    }
    public function delete() {
        return  unlink($this->URI);
    }
    public function copyTo($_Target) {
        return  copy($this->URI, $_URI);
    }
}

// ------------------------------
//
//    SQLite OOP Wrapper  v0.5
//
// ------------------------------

class SQL_Table {
    private $ownerBase;
    private $name;

    public function __construct($_DataBase, $_Name) {
        $this->ownerBase = $_DataBase;
        $this->name = $_Name;
    }

    public function insert($_Record) {
        $_Field_Name = array();  $_Field_Value = array();

        foreach ($_Record  as  $_Name => $_Value)
            if ($_Value !== null) {
                $_Field_Name[] = $_Name;
                $_Field_Value[] = (gettype($_Value) == 'string')  ?
                    $this->ownerBase->quote($_Value)  :  $_Value;
            }
        return  $this->ownerBase->exec(join('', array(
            "insert into {$this->name} (",
            join(', ', $_Field_Name),
            ') values (',
            join(', ', $_Field_Value),
            ')'
        )));
    }
    public function update($_Where, $_Data) {
        $_Set_Data = array();

        foreach ($_Data  as  $_Name => $_Value)
            $_Set_Data[] = "{$_Name}=".(
                (gettype($_Value) == 'string')  ?
                    $this->ownerBase->quote($_Value)  :  $_Value
            );
        return  $this->ownerBase->exec(join(' ', array(
            "update {$this->name} set",
            join(', ', $_Set_Data),
            "where {$_Where}"
        )));
    }
    public function delete($_Where) {
        return  $this->ownerBase->exec(
            "delete from {$this->name} where {$_Where}"
        );
    }
}
class EasySQLite {
    private static $statement = array(
        'select'  =>  array('select', 'from', 'where', 'order by', 'limit', 'offset')
    );
    private static $allTable = array(
        'select'  =>  'name, sql',
        'from'    =>  'SQLite_Master',
        'where'   =>  "type = 'table'"
    );
    private static function queryString($_SQL_Array) {
        $_SQL = array();

        foreach (self::$statement  as  $_Name => $_Key)
            if (isset( $_SQL_Array[$_Name] ))
                for ($i = 0;  $i < count($_Key);  $i++)
                    if (isset( $_SQL_Array[ $_Key[$i] ] )) {
                        $_SQL[] = $_Key[$i];
                        $_SQL[] = $_SQL_Array[ $_Key[$i] ];
                    }
        return  join(' ', $_SQL);
    }

    private $dataBase;
    private $table = array();

    public function __construct($_Base_Name) {
        if (! ($_Base_Name instanceof FS_Directory))
            new FS_Directory( pathinfo($_Base_Name, PATHINFO_DIRNAME) );
        try {
            $this->dataBase = new PDO("sqlite:{$_Base_Name}.db");
        } catch (PDOException $_Error) {
            echo '[Error - '.basename($_Base_Name).']  '.$_Error->getMessage();
        }
    }
    public function query($_SQL_Array) {
        $_Query = $this->dataBase->query( self::queryString( $_SQL_Array ) );

        return  $_Query ? $_Query->fetchAll() : array();
    }
    public function existTable($_Name) {
        $_Statement = self::$allTable;
        $_Statement['where'] .= " and name = '{$_Name}'";

        return  !! count( $this->query($_Statement) );
    }
    private function addTable($_Name) {
        return  $this->table[$_Name] = new SQL_Table($this->dataBase, $_Name);
    }
    public function __get($_Name) {
        if (isset( $this->table[$_Name] ))
            return $this->table[$_Name];
        elseif ($this->existTable( $_Name ))
            return $this->addTable($_Name);
    }

    public function createTable($_Name, $_Column_Define) {
        if ($this->existTable( $_Name ))  return;

        $_Define_Array = array();

        foreach ($_Column_Define  as  $_Key => $_Define)
            $_Define_Array[] = "{$_Key} {$_Define}";

        $_Result = $this->dataBase->exec(
            "create Table {$_Name} (\n    ".join(",\n    ", $_Define_Array)."\n)"
        );
        return  is_numeric($_Result) ? (!! $this->addTable($_Name)) : false;
    }
    public function dropTable($_Name) {
        $_Result = $this->dataBase->exec("drop Table {$_Name}");
        if (is_numeric( $_Result )) {
            unset( $this->table[$_Name] );
            return true;
        }
    }
}
// ----------------------------------------
//
//    Simple HTTP Server & Client  v0.8
//
// ----------------------------------------

class HTTP_Response {
    public static $statusCode = array(
        '100'  =>  'Continue',
        '101'  =>  'Switching Protocols',
        '200'  =>  'OK',
        '201'  =>  'Created',
        '202'  =>  'Accepted',
        '203'  =>  'Non-authoritative Information',
        '204'  =>  'No Content',
        '205'  =>  'Reset Content',
        '206'  =>  'Partial Content',
        '300'  =>  'Multiple Choices',
        '301'  =>  'Moved Permanently',
        '302'  =>  'Found',
        '303'  =>  'See Other',
        '304'  =>  'Not Modified',
        '305'  =>  'Use Proxy',
        '306'  =>  'Unused',
        '307'  =>  'Temporary Redirect',
        '400'  =>  'Bad Request',
        '401'  =>  'Unauthorized',
        '402'  =>  'Payment Required',
        '403'  =>  'Forbidden',
        '404'  =>  'Not Found',
        '405'  =>  'Method Not Allowed',
        '406'  =>  'Not Acceptable',
        '407'  =>  'Proxy Authentication Required',
        '408'  =>  'Request Timeout',
        '409'  =>  'Conflict',
        '410'  =>  'Gone',
        '411'  =>  'Length Required',
        '412'  =>  'Precondition Failed',
        '413'  =>  'Request Entity Too Large',
        '414'  =>  'Request-url Too Long',
        '415'  =>  'Unsupported Media Type',
        '416'  =>  '',
        '417'  =>  'Expectation Failed',
        '428'  =>  'Precondition Required',
        '429'  =>  'Too Many Requests',
        '431'  =>  'Request Header Fields Too Large',
        '500'  =>  'Internal Server Error',
        '501'  =>  'Not Implemented',
        '502'  =>  'Bad Gateway',
        '503'  =>  'Service Unavailable',
        '504'  =>  'Gateway Timeout',
        '505'  =>  'HTTP Version Not Supported',
        '511'  =>  'Network Authentication Required'
    );
    private static function getFriendlyHeaders($_Header_Array) {
        $_Header = array();

        foreach ($_Header_Array as $_Str) {
            $_Item = explode(':', $_Str, 2);

            if (isset( $_Item[1] )) {
                $_Header[trim( $_Item[0] )] = trim( $_Item[1] );
                continue;
            }
            if ( preg_match('#HTTP/[\d\.]+\s+(\d+)#', $_Str, $_Num) )
                $_Header['Response-Code'] = intval( $_Num[1] );
            else
                $_Header[] = $_Str;
        }
        return $_Header;
    }

    public  $headers;
    private $data;
    private $dataJSON;

    public function __construct($_Header, $_Data) {
        $this->headers = isset($_Header[0]) ? self::getFriendlyHeaders($_Header) : $_Header;
        $this->data = $_Data;
        $this->dataJSON = json_decode($_Data, true);
    }
    public function __get($_Key) {
        return $this->{$_Key};
    }
    public function __set($_Key, $_Value) {
        switch ($_Key) {
            case 'data':        {
                $this->data = $_Value;
                $this->dataJSON = json_decode($_Value, true);
                break;
            }
            case 'dataJSON':    {
                $this->data = json_encode($_Value);
                $this->dataJSON = $_Value;
            }
        }
    }
}
class HTTP_Cookie {
    private $cookie = array();

    public function __construct($_Cookie) {
        if (is_array( $_Cookie ))
            return  $this->cookie = $_Cookie;

        if (function_exists('http_parse_cookie'))
            return  $this->cookie = http_parse_cookie($_Cookie);

        $_Cookie = explode(';', $_Cookie, 2);

        foreach ($_Cookie as $_Item) {
            $_Item = explode('=', $_Item, 2);
            $this->cookie[trim( $_Item[0] )] = trim( $_Item[1] );
        }
    }
    public function __toString() {
        if (function_exists('http_build_cookie'))
            return  http_build_cookie($this->cookie);

        $_Cookie = array();

        foreach ($this->cookie  as  $_Key => $_Value)
            $_Cookie[] = "{$_Key}={$_Value}";

        return  join('; ', $_Cookie);
    }

    public function get($_Name) {
        if (isset( $this->cookie[$_Name] ))  return $this->cookie[$_Name];
    }
    public function set($_Name, $_Value) {
        $this->cookie[$_Name] = $_Value;
    }
}

class EasyHTTPServer {
    private static $Request_Header = array(
        'REMOTE_ADDR', 'REQUEST_METHOD', 'CONTENT_TYPE', 'CONTENT_LENGTH'
    );
    private static function getRequestHeaders() {
        $_Header = array();  $_Take = false;

        foreach ($_SERVER  as  $_Key => $_Value) {
            if (substr($_Key, 0, 5) == 'HTTP_') {
                $_Key = substr($_Key, 5);
                $_Take = true;
            }
            if ($_Take  ||  in_array($_Key, self::$Request_Header)) {
                $_Header[str_replace(' ', '-', ucwords(
                    strtolower( str_replace('_', ' ', $_Key) )
                ))] = $_Value;
                $_Take = false;
            }
        }
        return $_Header;
    }

    private static $IPA_Header = array('Client-Ip', 'X-Forwarded-For', 'Remote-Addr');

    private static function getRequestIPA($_Header) {
        foreach (self::$IPA_Header as $_Key)
            if (! empty( $_Header[$_Key] ))
                return $_Header[$_Key];
    }

    public $requestHeaders;
    public $requestIPAddress;
    public $requestCookie;

    private function setStatus($_Code) {
        $_Message = isset( HTTP_Response::$statusCode[$_Code] )  ?
            HTTP_Response::$statusCode[$_Code]  :  '';

        header("HTTP/1.1 {$_Code} {$_Message}");

        if ($_Code == 429)
            header('Retry-After: '.func_get_arg(1));
    }

    public function setHeader($_Head,  $_Value = null) {
        if (! is_array($_Head))
            $_Head = array("{$_Head}" => $_Value);

        if (! isset( $_Head['X-Powered-By'] ))
            $_Head['X-Powered-By'] = '';
        if (stripos($_Head['X-Powered-By'], 'EasyLibs')  ===  false) {
            $_Head['X-Powered-By'] .= '; EasyLibs.php/1.5';
            $_Head['X-Powered-By'] = trim(
                preg_replace('/;\s*;/', ';', $_Head['X-Powered-By']),  ';'
            );
        }
        if (isset( $_Head['WWW-Authenticate'] ))
            $this->setStatus(401);
        else
            $this->setStatus(
                isset( $_Head['Response-Code'] )  ?  $_Head['Response-Code']  :  200
            );
        foreach ($_Head  as  $_Key => $_String)
            header("{$_Key}: {$_String}");

        return $this;
    }

    public function __construct($_xDomain = false) {
        $_Header = $this->requestHeaders = self::getRequestHeaders();
        $this->requestIPAddress = self::getRequestIPA( $this->requestHeaders );
        $this->requestCookie = new HTTP_Cookie( $_Header['Cookie'] );

        if (! $_xDomain)  return;

        if ($_Header['Request-Method'] != 'OPTION')  return;

        $this->setHeader(array(
            'Access-Control-Allow-Origin'   =>
                isset( $_Header['Origin'] )  ?  $_Header['Origin']  :  '*',
            'Access-Control-Allow-Methods'  =>
                isset( $_Header['Access-Control-Request-Methods'] )  ?
                    $_Header['Access-Control-Request-Methods']  :  'GET,POST',
            'Access-Control-Allow-Headers'  =>
                isset( $_Header['Access-Control-Request-Headers'] )  ?
                    $_Header['Access-Control-Request-Headers']  :  'X-Requested-With'
        ));
        exit;
    }

    public function setCookie($_Key,  $_Value = null) {
        if (! is_array($_Key))
            $_Key = array("{$_Key}" => $_Value);

        $this->setHeader('Set-Cookie',  new HTTP_Cookie($_Key));
    }
    public function auth($_Tips = 'Auth Needed',  $_Check_Handle) {
        if (isset( $_SERVER['PHP_AUTH_USER'] )  &&  isset( $_SERVER['PHP_AUTH_PW'] )) {
            if (false !== call_user_func(
                $_Check_Handle,  $_SERVER['PHP_AUTH_USER'],  $_SERVER['PHP_AUTH_PW'],  $this
            ))
                return;
            else
                $this->setStatus(403);
        } else
            $this->setHeader('WWW-Authenticate', "Basic realm=\"{$_Tips}\"");

        exit;
    }
    public function send($_Data,  $_Header = null) {
        if ($_Data instanceof HTTP_Response) {
            $_Header = $_Data->headers;
            $_Data = $_Data->data;
        }
        if ($_Header)  $this->setHeader($_Header);
        echo  is_string($_Data) ? $_Data : json_encode($_Data);
        ob_flush() & flush();
    }

    public function redirect($_URL,  $_Second = 0,  $_Tips = '') {
        if ($_Second)
            $this->send($_Tips, array(
                'Refresh'  =>  "{$_Second}; url={$_URL}"
            ));
        else
            $this->setHeader('Location', $_URL);

        exit;
    }
    public function download($_File) {
        $this->send((new FS_File($_File))->readAll(),  array(
            'Content-Type'               =>  'application/octet-stream',
            'Content-Disposition'        =>  'attachment; filename="'.basename($_File).'"',
            'Content-Transfer-Encoding'  =>  'binary'
        ));
        exit;
    }
}

class EasyHTTPClient {
    private static function setRequestHeaders($_Header_Array) {
        $_Header = array();

        foreach ($_Header_Array  as  $_Key => $_Value)
            $_Header[] = "$_Key: $_Value";

        if (
            empty( $_Header_Array['Content-Type'] )  &&
            isset( $_Header_Array['Request-Method'] )  &&
            (strtoupper( $_Header_Array['Request-Method'] )  ==  'POST')
        )
            $_Header[] = 'Content-Type: application/x-www-form-urlencoded';

        return  join("\r\n", $_Header);
    }

    private function request($_Method,  $_URL,  $_Header,  $_Data = array()) {
        $_Response = @file_get_contents($_URL, false, stream_context_create(array(
            'http' => array(
                'method'   =>  $_Method,
                'header'   =>  self::setRequestHeaders($_Header),
                'content'  =>  http_build_query($_Data)
            )
        )));
        return  ($_Response !== false)  ?
            new HTTP_Response($http_response_header, $_Response)  :  $_Response;
    }

    public function head($_URL) {
        stream_context_set_default(array(
            'http' => array(
                'method' => 'HEAD'
            )
        ));
        return  get_headers($_URL, 1);
    }
    public function get($_URL,  $_Header = array()) {
        return  $this->request('GET', $_URL, $_Header);
    }
    public function post($_URL,  $_Data,  $_Header = array()) {
        return  $this->request('POST', $_URL, $_Data, $_Header);
    }
    public function delete($_URL,  $_Header = array()) {
        return  $this->request('DELETE', $_URL, $_Header);
    }
    public function put($_URL,  $_Data,  $_Header = array()) {
        return  $this->request('PUT', $_URL, $_Data, $_Header);
    }
}