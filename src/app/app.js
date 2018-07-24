import 'babel-polyfill';
import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import Input from '@jetbrains/ring-ui/components/input/input';
import Link, {linkHOC} from '@jetbrains/ring-ui/components/link/link';
import Text from '@jetbrains/ring-ui/components/text/text';
import Loader from '@jetbrains/ring-ui/components/loader/loader';
import fetchJsonp from 'fetch-jsonp';
import '@jetbrains/ring-ui/components/form/form.scss';


import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved

import styles from './app.css';

const flaggedLanguages = ['French', 'German', 'Japanese', 'Russian', 'Spanish'];

class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi} = props;

    this.state = {
      isConfiguring: true,
      dataFetchFailed: false
    };

    registerWidgetApi({
      onConfigure: () => this.setState({isConfiguring: true}),
      onRefresh: () => this.loadCrowdinData()
    });
  }

  componentDidMount() {
    this.initialize(this.props.dashboardApi);
  }

  initialize(dashboardApi) {
    dashboardApi.readConfig().then(config => {
      if (!config) {
        return;
      }
      this.setState(
        {isConfiguring: false,
          projectId: config.projectId,
          apiKey: config.apiKey}
      );
      this.loadCrowdinData();
    });

  }

  saveConfig = async () => {
    const {projectId, apiKey} = this.state;
    await this.props.dashboardApi.storeConfig({projectId, apiKey});
    this.setState({isConfiguring: false});
    this.loadCrowdinData();
  };

  cancelConfig = async () => {
    this.setState({isConfiguring: false});
    await this.props.dashboardApi.exitConfigMode();
    this.initialize(this.props.dashboardApi);
  };

  changeProjectId = e => this.setState({
    projectId: e.target.value
  });

  changeApiKey = e => this.setState({
    apiKey: e.target.value
  });

  renderConfiguration() {
    const {projectId, apiKey} = this.state;

    return (
      <div className={styles.widget}>
        <div className="ring-form__group">
          <Input
            placeholder="Project id"
            onChange={this.changeProjectId}
            value={projectId}
          />
        </div>

        <div className="ring-form__group">
          <Input
            placeholder="API key"
            onChange={this.changeApiKey}
            value={apiKey}
            type="password"
          />
        </div>
        <Panel>
          <Button blue={true} onClick={this.saveConfig}>{'Save'}</Button>
          <Button onClick={this.cancelConfig}>{'Cancel'}</Button>
        </Panel>
      </div>
    );
  }

  loadCrowdinData() {
    this.setState({data: null, dataFetchFailed: false});
    fetchJsonp(`https://api.crowdin.com/api/project/${this.state.projectId}/status?key=${this.state.apiKey}`, {
      jsonpCallback: 'jsonp'
    }).then(response => response.json()).then(json => {
      this.setState({data: json, dataFetchFailed: ''});
    }).catch(() => {
      this.setState({data: null, dataFetchFailed: true});
    }
    );
  }

  render() {
    const {isConfiguring, data, dataFetchFailed} = this.state;

    if (isConfiguring) {
      return this.renderConfiguration();
    }

    if (data) {
      const crowdinProjectUrl = `https://crowdin.com/project/${this.state.projectId}/`;

      return (
        <div className={styles.widget}>
          <Text className={'title'}>{`Project ID: ${this.state.projectId}`}</Text>
          <table >
            <tbody>
              {data.map(language => {
                let flagFilename;
                if (flaggedLanguages.indexOf(language.name) > -1) {
                  flagFilename = `pict/${language.name.toLowerCase()}_flag.png`;
                } else {
                  flagFilename = 'pict/default_flag.png';
                }
                return (<tr key={language.name} style={{width: '55px'}}>
                  <td>
                    <div><img className={'flag'} src={flagFilename}/></div>
                  </td>
                  <td>
                    <div>{`${language.name} ${language.translated_progress}%`}</div>
                  </td>
                  <td style={{width: '20%'}}>
                    <div>
                      <Link href={`${crowdinProjectUrl}${language.code}#`}>
                        {`Missing ${language.words - language.words_translated} phrases`}
                      </Link>
                    </div>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (dataFetchFailed) {
      return <div><Text className={`${styles.widget} ${styles.error}`}>Failed fetching data from Crowdin!</Text></div>;
    } else {
      return (
        <div><Loader message="Loading..."/></div>);
    }
  }
}

DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) =>
  render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  )
);
